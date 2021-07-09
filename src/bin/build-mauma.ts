import { dirname, join } from 'path';
import nunjucks, { Environment } from 'nunjucks';
import { mkdir, writeFile } from 'fs/promises';
const { register: esbuildRegister } = require('esbuild-register/dist/node')
import del from 'del';

import { MaumaConfig } from '../public/types';
import { getOutputFile, getPermalink, getRoutes, Route, RouteInstance, RouteParams, validateRouteEntries } from '../route/utils';
import { RenderContext } from '../route/route-builder';

// Register on the fly TS => JS converter
esbuildRegister();

const config: MaumaConfig = require(`${process.cwd()}/src/config.ts`).default;
const viewsDir = join(process.cwd(), 'src/views');
const routesDir = join(process.cwd(), 'src/routes');
const clientDir = join(process.cwd(), 'src/client');
const scssDir = join(process.cwd(), 'src/scss');
const maumaDir = join(process.cwd(), '.mauma');
const prebuildDir = join(process.cwd(), '.mauma/build');
const buildDir = join(process.cwd(), 'build');
const nunjucksEnv = nunjucks.configure([routesDir, viewsDir], { autoescape: false });

interface NunjucksThis {
  env: Environment;
  ctx: RenderContext;
}

(async () => {
  // Remove build directory
  await del(maumaDir);

  const routes: Route[] = await getRoutes(routesDir, viewsDir, nunjucksEnv);
  const routeIssues = validateRouteEntries(routes);

  // Configure Nunjucks
  nunjucksEnv.addGlobal('config', config);

  nunjucksEnv.addGlobal('haslocale', function (this: NunjucksThis, locale: string): boolean {
    const { instance, route } = this.ctx;

    if (route.i18nMap.has(instance.key)) {
      return route.i18nMap.get(instance.key)!.has(locale);
    }

    return false;
  });

  nunjucksEnv.addGlobal('switchlocale', function (this: NunjucksThis, locale: string): string {
    const { instance, route } = this.ctx;

    if (route.i18nMap.has(instance.key)) {
      if (route.i18nMap.get(instance.key)!.has(locale)) {
        const translation = route.i18nMap.get(instance.key)!.get(locale)!;
        return getPermalink(config.i18n, route, translation);
      }
    }

    return '';
  });

  nunjucksEnv.addGlobal('url', function (this: NunjucksThis, name: string, params?: RouteParams, locale?: string): string {
    const route = routes.find(route => name === route.name);

    if (route) {
      const instance: RouteInstance = {
        key: route.name,
        locale: locale ?? this.ctx.locale,
        params: params ?? {},
      };

      return getPermalink(config.i18n, route, instance);
    } else {
      return '';
    }
  });

  if (routeIssues.length > 0) {
    // TODO: Improve reporting
    console.log(routeIssues);
    throw new Error('Route issues!!');
  }

  for (const route of routes) {
    const instances = await route.getInstances({ config, route });

    // Process instances
    for (const instance of instances) {
      // Get instance data
      // It's important to load ALL the data before rendering
      instance.data = await route.getData(instance);

      // Set related i18n instances map
      if (!route.i18nMap.has(instance.key)) {
        route.i18nMap.set(instance.key, new Map());
      }

      if (instance.locale) {
        route.i18nMap.get(instance.key)!.set(instance.locale, instance);
      }
    }

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
      const outputFile = getOutputFile(config.i18n, route, instance);
      const outputPath = join(prebuildDir, outputFile);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content);
    }
  }
})();
