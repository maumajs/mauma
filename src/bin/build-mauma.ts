import { dirname, join } from 'path';
import nunjucks from 'nunjucks';
import { mkdir, writeFile } from 'fs/promises';
const { register: esbuildRegister } = require('esbuild-register/dist/node')
import del from 'del';

import { Config, ConfigFn } from '../public/types';
import { getRoutes, validateRouteEntries } from '../route/utils';
import { configureNunjucks } from '../view/configure-nunjucks';

// Register on the fly TS => JS converter
esbuildRegister();

const configFn: ConfigFn = require(`${process.cwd()}/src/config.ts`).default;
const maumaDir = join(process.cwd(), '.mauma');
const prebuildDir = join(process.cwd(), '.mauma/build');

(async () => {
  // Remove build directory
  await del(maumaDir);

  if (typeof configFn !== 'function') {
    throw new Error(`"config.ts" must return an async function implementing "ConfigFn"`);
  }

  // Create `Config` object
  const userConfig = await configFn();
  const config: Config = {
    dir: {
      build: userConfig.dir?.build ?? join(process.cwd(), 'build'),
      client: userConfig.dir?.client ?? join(process.cwd(), 'src/client'),
      routes: userConfig.dir?.routes ?? join(process.cwd(), 'src/routes'),
      scss: userConfig.dir?.scss ?? join(process.cwd(), 'src/scss'),
      views: userConfig.dir?.views ?? join(process.cwd(), 'src/views'),
    },
    i18n: userConfig.i18n,
  };

  // Load routes
  const nunjucksEnv = nunjucks.configure([config.dir.routes, config.dir.views], { autoescape: false });
  const routes = await getRoutes(config, nunjucksEnv);
  const routeIssues = validateRouteEntries(routes);

  // Configure Nunjucks
  if (userConfig.configureNunjucks) {
    userConfig.configureNunjucks(nunjucksEnv, config, routes);
  }

  configureNunjucks(nunjucksEnv, config, routes);

  if (routeIssues.length > 0) {
    // TODO: Improve reporting
    console.log(routeIssues);
    throw new Error('Route issues!!');
  }

  for (const route of routes) {
    await route['loadInstances']();

    // Render
    for (const instance of route) {
      const content = await route.render({
        config: config,
        routes: routes,
        route: route,
        instance: instance,
        locale: instance.locale,
        params: instance.params,
        data: instance.data,
      });

      // Save
      const outputPath = join(prebuildDir, instance.output);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content);
    }
  }
})();
