import { dirname, join } from 'path';
import nunjucks from 'nunjucks';
import { mkdir, writeFile } from 'fs/promises';
const { register: esbuildRegister } = require('esbuild-register/dist/node')
import del from 'del';

import { MaumaConfigFn } from '../public/types';
import { getRoutes, processInstances, Route, validateRouteEntries } from '../route/utils';
import { configureNunjucks } from '../view/configure-nunjucks';

// Register on the fly TS => JS converter
esbuildRegister();

const configFn: MaumaConfigFn = require(`${process.cwd()}/src/config.ts`).default;
const viewsDir = join(process.cwd(), 'src/views');
const routesDir = join(process.cwd(), 'src/routes');
const clientDir = join(process.cwd(), 'src/client');
const scssDir = join(process.cwd(), 'src/scss');
const maumaDir = join(process.cwd(), '.mauma');
const prebuildDir = join(process.cwd(), '.mauma/build');
const buildDir = join(process.cwd(), 'build');
const nunjucksEnv = nunjucks.configure([routesDir, viewsDir], { autoescape: false });

(async () => {
  // Remove build directory
  await del(maumaDir);

  if (typeof configFn !== 'function') {
    throw new Error(`"config.ts" must return an async function implementing "MaumaConfigFn"`);
  }

  const config = await configFn();
  const routes: Route[] = await getRoutes(routesDir, viewsDir, nunjucksEnv);
  const routeIssues = validateRouteEntries(routes);

  // Configure Nunjucks
  configureNunjucks(nunjucksEnv, config, routes);

  if (routeIssues.length > 0) {
    // TODO: Improve reporting
    console.log(routeIssues);
    throw new Error('Route issues!!');
  }

  for (const route of routes) {
    const instancesBase = await route.getInstances({ config, route });
    const instances = await processInstances(config.i18n, route, instancesBase);

    // Render
    for (const instance of instances) {
      const content = await route.render({
        config: config,
        route: route,
        instance: instance,
        data: instance.data,
        params: instance.params,
        locale: instance.locale,
      });

      // Save
      const outputPath = join(prebuildDir, instance.output);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content);
    }
  }
})();
