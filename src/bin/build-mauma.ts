import { dirname, join } from 'path';
import nunjucks, { Environment } from 'nunjucks';
import { mkdir, writeFile } from 'fs/promises';
import del from 'del';

import { MaumaConfig } from '../public/types';
import { getPermalink, getRoutes, Route, RouteParams, validateRouteEntries } from '../route/utils';
import { RenderContext } from '../route/route-builder';

// Register on the fly TS => JS converter
require('@swc-node/register');

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

    if (instance.key in route.i18nMap) {
      if (locale in route.i18nMap[instance.key]) {
        return true;
      }
    }

    return false;
  });

  nunjucksEnv.addGlobal('switchlocale', function (this: NunjucksThis, locale: string): string {
    const { instance, route } = this.ctx;

    if (instance.key in route.i18nMap) {
      if (locale in route.i18nMap[instance.key]) {
        const translation = route.i18nMap[instance.key][locale];

        return getPermalink({
          i18nEnabled: route.i18nEnabled,
          config: config.i18n,
          permalink: route.permalink,
          defaultValue: route.internalURL,
          locale,
          params: translation.params,
        });
      }
    }

    return '';
  });

  nunjucksEnv.addGlobal('url', function (this: NunjucksThis, name: string, params?: RouteParams, locale?: string): string {
    const route = routes.find(route => name === route.name);

    if (route) {
      params = params ?? {};
      locale = locale ?? this.ctx.locale;

      return getPermalink({
        i18nEnabled: route.i18nEnabled,
        config: config.i18n,
        permalink: route.permalink,
        defaultValue: route.internalURL,
        locale,
        params,
      });
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

    // Set related i18n instances map
    for (const instance of instances) {
      if (!(instance.key in route.i18nMap)) {
        route.i18nMap[instance.key] = {};
      }

      if (instance.locale) {
        route.i18nMap[instance.key][instance.locale] = instance;
      }
    }

    // Render
    for (const instance of instances) {
      const outputFile = getPermalink({
        i18nEnabled: route.i18nEnabled,
        config: config.i18n,
        permalink: route.output,
        defaultValue: route.defaultOutput,
        locale: instance.locale,
        params: instance.params,
      });
      const data = await route.getData(instance);
      const ctx: RenderContext = {
        config: config,
        route: route,
        instance: instance,
        data: data,
        params: instance.params,
        locale: instance.locale,
      };

      // Render & save
      const content = await route.render(ctx);
      const outputPath = join(prebuildDir, outputFile);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content);
    }
  }
})();
