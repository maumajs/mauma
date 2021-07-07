import globby from 'globby';
import { extname, join } from 'path';
import { constants } from 'fs';
import { access, stat } from 'fs/promises';
import nunjucks from 'nunjucks';

import { GetDataFn, GetRouteInstancesFn, RenderFn, RouteBuilder } from './route-builder';
import { MaumaI18NConfig, MaumaI18NStrategy } from '../public/types';

export type RoutePermalink = string | Record<string, string>;
export type RouteParams = Record<string, string | string[]>;

export interface RouteBase {
  readonly name: string;
  readonly file: string;
  readonly internalURL: string;
  readonly defaultOutput: string;
  readonly regex: RegExp;
  readonly isCatchAll: boolean;
  readonly isDynamic: boolean;
}

export interface Route extends RouteBase {
  readonly template: string;
  readonly i18nEnabled: boolean;
  readonly i18nMap: Record<string, Record<string, RouteInstance>>;
  readonly permalink: string | Record<string, string>;
  readonly output: string | Record<string, string>;
  readonly getInstances: GetRouteInstancesFn;
  readonly getData: GetDataFn;
  readonly render: RenderFn;
}

export interface RouteInstance<Data = any> {
  id: string;
  locale?: string;
  params: RouteParams;
  data?: Data;
}

export interface RouteIssue {
  name: string;
  matches: string[];
}

export function appendIndexHTML(path: string): string {
  const ext = extname(path);
  const hasTrailingSlash = path[path.length - 1] === '/';

  if (ext === '' || hasTrailingSlash) {
    path = path.replace(/\/+$/, '');
    return `${path}/index.html`;
  } else {
    return path;
  }
}

export function addTrailingSlash(url: string): string {
  const ext = extname(url);
  const hasTrailingSlash = url[url.length - 1] === '/';

  if (ext === '' && !hasTrailingSlash) {
    return `${url}/`;
  } else {
    return url;
  }
}

export function getRouteURL(file: string): string {
  const id = file
    .replace(/index\.ts$/, '') // Remove `index.ts`
    .replace(/\.ts$/, '')      // Remove `.ts`
    .replace(/^\/+/, '')       // Remove slashes from start
    .replace(/\/+$/, '');      // Remove trailing slashes

  // Prepend back the root slash
  return `/${id}`;
}

export function getRouteName(file: string): string {
  return file
    .replace(/^\/+/, '') // Remove slashes from start
    .split('/')
    .map(part => part
      .replace('.ts', '')
      .replace(/[\[\]\.]/g, '') // Remove all: [ ] . 
    )
    .join('-');
}

export function getInternalURLRegex(internalURL: string): RegExp {
  return new RegExp(getInternalURLRegexStr(internalURL));
}

export function getInternalURLRegexStr(internalURL: string): string {
  // Replace [param] or [...param] with named group regex
  const regex = internalURL.replace(/(\[.*?\])/g, (match) => {
    const groupName = match.replace(/[\[\]\.]/g, '');

    if (!match.includes('...')) {
      // [param], match anything except: ? /
      return `(?<${groupName}>[^?\/]+)`;
    } else {
      // [...param], match anything except: ?
      return `(?<${groupName}>[^?]+)`;
    }
  });

  return `^${regex}$`;
}

export function mapFileToRouteBase(file: string): RouteBase {
  const internalURL = getRouteURL(file);
  const regex = getInternalURLRegex(internalURL);
  const name = getRouteName(file);
  const isCatchAll = file.includes('[...');
  const isDynamic = file.includes('[');
  const defaultOutput = appendIndexHTML(internalURL);

  return { name, file, internalURL, defaultOutput, regex, isCatchAll, isDynamic };
}

export function addTrailingSlashToPermalink(permalink: RoutePermalink): RoutePermalink {
  if (typeof permalink === 'string') {
    return addTrailingSlash(permalink);
  } else {
    return Object.entries(permalink)
      .map(([locale, url]) => [locale, addTrailingSlash(url)])
      .reduce((result, [locale, output]) => ({ ...result, [locale]: output }), {});
  }
}

export function mapPermalinkToOutput(permalink: RoutePermalink): RoutePermalink {
  if (typeof permalink === 'string') {
    return appendIndexHTML(permalink);
  } else {
    return Object.entries(permalink)
      .map(([locale, url]) => [locale, appendIndexHTML(url)])
      .reduce((result, [locale, output]) => ({ ...result, [locale]: output }), {});
  }
}

export async function getRouteFiles(dir: string): Promise<string[]> {
  // Remove all trailing slashes
  dir = dir.replace(/\/+$/, '');

  // Check if it's a valid directory
  const dirStat = await stat(dir);

  if (!dirStat.isDirectory()) {
    throw new Error(`The directory "${dir}" doesn't exist.`);
  }

  // Process directory
  return globby([join(dir, '/**/*.ts')]);
}

export async function getRoutes(routesDir: string, viewsDir: string, nunjucks: nunjucks.Environment): Promise<Route[]> {
  const files = await getRouteFiles(routesDir);
  const routes: Route[] = [];

  for (const fileFullPath of files) {
    const file = fileFullPath.replace(routesDir, '');
    const routeFullPath = join(routesDir, file);
    const routeBuilder: RouteBuilder = require(routeFullPath).default;
    const routeConfig = routeBuilder['getRouteConfig']();
    const routeBase = mapFileToRouteBase(file);

    const template = `${join(viewsDir, 'routes', routeBase.name)}.njk`;
    const i18nEnabled = routeConfig.i18nEnabled;
    const i18nMap = {};
    const getInstances: GetRouteInstancesFn = routeConfig.getInstances ?? getInstancesDefault;
    const getData: GetDataFn = routeConfig.getData ?? getDataDefault;
    const render: RenderFn = routeConfig.render ?? renderDefault(nunjucks);
    const permalink = addTrailingSlashToPermalink(routeConfig.getPermalink ? await routeConfig.getPermalink() : routeBase.internalURL);
    const output = mapPermalinkToOutput(permalink);

    if (routeBase.isDynamic && !routeConfig.getInstances) {
      throw new Error(`Route "${routeBase.name}" is dynamic but it's missing "getInstances()"`);
    }

    if (!i18nEnabled && typeof permalink !== 'string') {
      throw new Error(`Route "${routeBase.name}" has i18n disabled, but "getPermalink()" returns an object. Return a string instead.`);
    }

    routes.push({
      ...routeBase,
      template,
      i18nEnabled,
      i18nMap,
      file,
      permalink,
      output,
      getInstances,
      getData,
      render,
    });
  }

  return routes;
}

export interface GetPermalinkParams {
  i18nEnabled: boolean;
  config: MaumaI18NConfig;
  permalink: RoutePermalink;
  defaultValue: string;
  params: RouteParams;
  locale?: string;
}

export function getPermalink({ i18nEnabled, config, permalink, defaultValue, locale, params }: GetPermalinkParams): string {
  let out: string;

  // Move this part to its own function with tests
  if (typeof permalink === 'string') {
    out = permalink;
  } else {
    if (locale && permalink[locale]) {
      out = permalink[locale];
    } else {
      out = defaultValue;
    }
  }

  // This won't work /w [...all]
  // Move this part to its own function with tests
  // Replace params
  Object.entries(params).forEach(([param, value]) => {
    out = out.replace(`[${param}]`, value as string);
  });

  return i18nEnabled ? prependLocale(out, config, locale) : out;
}

// Prefix locale for i18n routes
export function prependLocale(file: string, config: MaumaI18NConfig, locale?: string): string {
  if (!!locale && (config.strategy === MaumaI18NStrategy.Prefix || locale !== config.defaultLocale)) {
    return `/${locale}${file}`;
  } else {
    return file;
  }
}

export const getInstancesDefault: GetRouteInstancesFn = async ({ config, route }) => {
  if (route.i18nEnabled) {
    return config.i18n.locales.map(({ code }) => ({ id: route.name, params: {}, locale: code }));
  } else {
    return [{ id: route.name, params: {}, locale: undefined }];
  }
};

export const getDataDefault: GetDataFn = async (instance) => {
  if (instance.data) {
    return instance.data;
  } else {
    return undefined;
  }
};

export function renderDefault(nunjucks: nunjucks.Environment): RenderFn {
  return async (ctx) => {
    if (await access(ctx.route.template, constants.R_OK).then(() => true)) {
      return nunjucks.render(ctx.route.template, ctx);
    } else {
      throw new Error(`Nunjucks template not found: ${ctx.route.template}`);
    }
  };
};

export function validateRouteEntries(routes: RouteBase[]): RouteIssue[] {
  const matches = new Map<string, string[]>();

  routes.forEach(({ name, internalURL }) => {
    routes.forEach(route => {
      if (route.regex.test(internalURL)) {
        matches.set(name, (matches.get(name) ?? []).concat(route.name));
      }
    });
  });

  return Array.from(matches.entries())
    .filter(([, matches]) => matches.length > 1)
    .map(([name, matches]) => ({ name, matches }));
}
