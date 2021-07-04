#!/usr/bin/env node
import { dirname, join } from 'path';
import nunjucks from 'nunjucks';
import { access, mkdir, writeFile } from 'fs/promises';
import { constants } from 'fs';
import del from 'del';

import { MaumaConfig } from '../public/types';
import { getRouteEntries, RouteRenderTask, validateRouteEntries } from '../route-utils';
import { GetOutputFileFn, RenderContext, RouteBuilder } from '../route-builder';
import { getOutputFile } from '../render';

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

  const routes = await getRouteEntries(routesDir);
  const routeIssues = validateRouteEntries(routes);

  console.log(routes);

  if (routeIssues.length > 0) {
    // TODO: Improve reporting
    console.log(routeIssues);
    throw new Error('Route issues!!');
  }

  for (const route of routes) {
    const routeFullPath = join(routesDir, route.file);
    const routeBuilder: RouteBuilder = require(routeFullPath).default;
    const routeConfig = routeBuilder['getRouteConfig']();
    const renderTasks: RouteRenderTask[] = [];

    if (routeConfig.getRouteInstances) {
      const routeInstances = await routeConfig.getRouteInstances();
      renderTasks.push(...routeInstances.map(instance => ({ route, config: routeConfig, instance })));
    } else {
      if (route.isDynamic) {
        throw new Error(`${route.name} is dynamic but it's missing "getRouteInstances()"`);
      } else {
        if (routeConfig.i18nEnabled) {
          config.i18n.locales.forEach(({ code }) => {
            renderTasks.push({ route, config: routeConfig, instance: { params: {}, locale: code } });
          });
        } else {
          renderTasks.push({ route, config: routeConfig, instance: { params: {}, locale: undefined } });
        }
      }
    }

    for (const task of renderTasks) {
      const getOutputFileFn: GetOutputFileFn = task.config.getOutputFile ?? getOutputFile;
      const outputFile = await getOutputFileFn({ config, task });
      const ctx: RenderContext = {
        config: config,
        data: undefined,
        params: task.instance.params,
        locale: task.instance.locale,
      };

      let content: string;

      if (task.config.getData) {
        ctx.data = await task.config.getData(task.instance.params);
      }

      if (task.config.render) {
        content = await task.config.render(ctx);
      } else {
        const nunjucksPath = join(routesDir, task.route.file.replace('.ts', '.njk'));

        if (await access(nunjucksPath, constants.R_OK).then(() => true)) {
          content = njksEnv.render(nunjucksPath, ctx);
        } else {
          throw new Error(`Nunjucks template not found: ${nunjucksPath}`)
        }
      }

      // Write to FS
      const outputPath = join(buildDir, outputFile);
      await mkdir(dirname(outputPath), { recursive: true });
      writeFile(outputPath, content);
    }
  }
})();
