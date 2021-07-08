import globby from 'globby';
import { extname, join } from 'path';
import { constants } from 'fs';
import { access, stat } from 'fs/promises';
import nunjucks from 'nunjucks';

import { GetDataFn, GetRouteInstancesFn, RenderFn, RouteBuilder } from './route-builder';
import { MaumaI18NConfig, MaumaI18NStrategy } from '../public/types';

export type RoutePermalink = string | Record<string, string> | ((instance: RouteInstance) => string);
export type RouteParams = Record<string, string | string[]>;

export interface RouteBase {
  readonly name: string;
  readonly file: string;
  readonly internalURL: string;
  readonly regex: RegExp;
  readonly isCatchAll: boolean;
  readonly isDynamic: boolean;
}

export interface Route extends RouteBase {
  readonly template: string;
  readonly i18nEnabled: boolean;
  readonly i18nMap: Record<string, Record<string, RouteInstance>>;
  readonly permalink: RoutePermalink;
  readonly getInstances: GetRouteInstancesFn;
  readonly getData: GetDataFn;
  readonly render: RenderFn;
}

export interface RouteInstance<Data = any> {
  key: string;
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
  const isParamCathAll = ext[ext.length - 1] === ']';

  if (ext === '' || hasTrailingSlash || isParamCathAll) {
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

const PARAM_REGEX = /(\[.*?\])/g;

export function getURLParams(url: string): string[] {
  return [...url.matchAll(PARAM_REGEX)].map(match => match[0]);
}

export function getInternalURLRegexStr(internalURL: string): string {
  // Replace [param] or [...param] with named group regex
  const regex = internalURL.replace(PARAM_REGEX, (match) => {
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

  return { name, file, internalURL, regex, isCatchAll, isDynamic };
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
    const permalink = routeConfig.getPermalink ? await routeConfig.getPermalink() : routeBase.internalURL;

    if (routeBase.isDynamic && !routeConfig.getInstances) {
      throw new Error(`Route "${routeBase.name}" is dynamic but it's missing "getInstances()"`);
    }

    if (!i18nEnabled && !['string', 'function'].includes(typeof permalink)) {
      throw new Error(`Route "${routeBase.name}" has i18n disabled, but "getPermalink()" returns an object. Return a string instead.`);
    }

    routes.push({
      ...routeBase,
      template,
      i18nEnabled,
      i18nMap,
      file,
      permalink,
      getInstances,
      getData,
      render,
    });
  }

  return routes;
}

export function getPermalink(config: MaumaI18NConfig, route: Route, instance: RouteInstance): string {
  let out = getPermalinkValue(route.permalink, route.internalURL, instance);
  out = replaceParams(out, instance.params);
  out = route.i18nEnabled ? prependLocale(out, config, instance.locale) : out;
  return addTrailingSlash(out);
}

export function getOutputFile(config: MaumaI18NConfig, route: Route, instance: RouteInstance): string {
  return appendIndexHTML(getPermalink(config, route, instance));
}

export function getPermalinkValue(permalink: RoutePermalink, defaultValue: string, instance: RouteInstance): string {
  if (typeof permalink === 'string') {
    return permalink;
  } if (typeof permalink === 'function') {
    return permalink(instance);
  } else {
    const locale = instance.locale;

    if (locale && permalink[locale]) {
      return permalink[locale];
    } else {
      return defaultValue;
    }
  }
}

export function replaceParams(url: string, params: RouteParams): string {
  Object.entries(params).forEach(([param, value]) => {
    if (url.includes(`[...${param}]`)) {
      url = url.replace(`[...${param}]`, (value as string[]).join('/'));
    } else {
      url = url.replace(`[${param}]`, value as string);
    }
  });

  // Check if there are unmatched params
  const unmatched = getURLParams(url);

  if (unmatched.length > 0) {
    throw new Error(`Unmatched param "${unmatched[0]}"`);
  }

  return url;
}

// Prefix locale for i18n routes
export function prependLocale(url: string, config: MaumaI18NConfig, locale?: string): string {
  if (!!locale && (config.strategy === MaumaI18NStrategy.Prefix || locale !== config.defaultLocale)) {
    return `/${locale}${url}`;
  } else {
    return url;
  }
}

export const getInstancesDefault: GetRouteInstancesFn = async ({ config, route }) => {
  if (route.i18nEnabled) {
    return config.i18n.locales.map(({ code }) => ({ key: route.name, params: {}, locale: code }));
  } else {
    return [{ key: route.name, params: {}, locale: undefined }];
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
