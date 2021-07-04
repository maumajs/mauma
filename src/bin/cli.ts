#!/usr/bin/env node
import { dirname, join } from 'path';
import nunjucks from 'nunjucks';
import { mkdir, writeFile } from 'fs/promises';
import del from 'del';

import { MaumaConfig } from '../public/types';
import { getOutputFile, getRoutes, prependLocale, Route, RouteRenderTask, validateRouteEntries } from '../route/utils';
import { RenderContext, RouteBuilder } from '../route/route-builder';

// Register on the fly TS => JS converter
require('@swc-node/register');

const config: MaumaConfig = require(`${process.cwd()}/src/config.ts`).default;
const viewsDir = join(process.cwd(), 'src/views');
const routesDir = join(process.cwd(), 'src/routes');
const buildDir = join(process.cwd(), 'build');
const njksEnv = nunjucks.configure([routesDir, viewsDir], { autoescape: true });

njksEnv.addGlobal('config', config);

(async () => {
  // Remove build directory
  await del(buildDir);

  const routes: Route[] = await getRoutes(routesDir, njksEnv);
  const routeIssues = validateRouteEntries(routes);

  console.log(routes);

  if (routeIssues.length > 0) {
    // TODO: Improve reporting
    console.log(routeIssues);
    throw new Error('Route issues!!');
  }

  for (const route of routes) {
    const instances = await route.getInstances({ config, route });

    for (const instance of instances) {
      const outputFile = getOutputFile(route.output, route.defaultOutput, instance);
      const outputFileLocalized = route.i18nEnabled ? prependLocale(outputFile, config, instance.locale) : outputFile;
      const data = await route.getData(instance);
      const ctx: RenderContext = {
        config: config,
        route: route,
        data: data,
        params: instance.params,
        locale: instance.locale,
      };

      // Render & save
      const content = await route.render(ctx);
      const outputPath = join(buildDir, outputFileLocalized);
      await mkdir(dirname(outputPath), { recursive: true });
      writeFile(outputPath, content);
    }
  }
})();
