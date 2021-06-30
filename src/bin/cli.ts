#!/usr/bin/env node
import globby from 'globby';
import { extname, join } from 'path';
import { constants } from 'fs';
import { access } from 'fs/promises';
import nunjucks from 'nunjucks';
import { Config, i18nStrategy } from '../misc/types';

// Register on the fly TS => JS converter
require('@swc-node/register');

const config: Config = require(`${process.cwd()}/src/config.ts`).default;

console.log(JSON.stringify({
  cwd: process.cwd(),
  dirname: __dirname,
  config,
}, null, 2));


const templatesPath = join(process.cwd(), 'src/templates');
const pagesPath = join(process.cwd(), 'src/pages');

nunjucks.configure([pagesPath, templatesPath], { autoescape: true });

(async () => {
  const fullPaths = await globby([join(pagesPath, '/**/*.ts')]);

  for (const fullPath of fullPaths) {
    const extension = extname(fullPath);
    const urlTemplate = fullPath.replace(pagesPath, '').replace('index.ts', '').replace(extension, '');
    const nunjucksPath = fullPath.replace('.ts', '.njk');
    const pageClass = require(fullPath).default;
    const instance = new pageClass();
    let routes = await instance.getRoutes();

    console.log(fullPath)

    if (routes.length === 0) {
      routes = config.i18n.locales.map(locale => ({ params: {}, locale }));
    }

    for (const route of routes) {
      const permalinks = instance.getPermalink();
      let url: string;

      if (route.locale in permalinks) {
        url = `${permalinks[route.locale]}`;
      } else {
        url = `${urlTemplate}`;
      }

      switch (config.i18n.strategy) {
        case i18nStrategy.Prefix:
          url = `/${route.locale}${url}`;
          break;

        case i18nStrategy.PrefixExceptDefault:
          if (route.locale !== config.i18n.defaultLocale) {
            url = `/${route.locale}${url}`;
          }
      }

      Object.entries(route.params).forEach(([param, value]) => {
        url = url.replace(`[${param}]`, value as string);
      });

      if (Object.getPrototypeOf(instance).hasOwnProperty('render')) {
        console.log('  ', url, instance.render(await instance.getData(route)));
      } else if (await access(nunjucksPath, constants.R_OK).then(() => true)) {
        console.log('  ', url, nunjucks.render(nunjucksPath, await instance.getData(route)));
      } else {
        console.log('  ', url, '> No way to render');
      }
    }

    console.log('');
  }
})();
