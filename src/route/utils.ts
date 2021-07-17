import globby from 'globby';
import { extname, join } from 'path';
import { constants } from 'fs';
import { access, stat } from 'fs/promises';
import nunjucks from 'nunjucks';

import { RouteBuilder } from './route-builder';
import { Config, I18nConfig, I18nStrategy } from '../public/types';
import { RouteCollection } from './route-collection';
import { Route } from './route';
import {
  GetDataFn,
  GetRouteInstancesFn,
  RenderFn,
  RouteBaseConfig,
  RouteInstanceConfig,
  RouteIssue,
  RouteParamConfig,
  RouteParams,
  RoutePermalink,
} from './types';

export function makeIterator<T>(arr: T[]): Iterator<T, any, undefined> {
  let nextIdx = 0;

  return {
    next: () => {
      return nextIdx < arr.length ? {
        value: arr[nextIdx++],
        done: false,
      } : {
        value: undefined,
        done: true,
      };
    }
  };
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

export function getURLParams(url: string): RouteParamConfig[] {
  return [...url.matchAll(PARAM_REGEX)].map(([match]) => ({
    isCatchAll: match.includes('...'),
    name: match.replace(/[\[\]\.]/g, ''),
    token: match,
  }));
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

export function mapFileToRouteBase(file: string): RouteBaseConfig {
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

export async function getRoutes(config: Config, nunjucks: nunjucks.Environment): Promise<RouteCollection> {
  const files = await getRouteFiles(config.dir.routes);
  const routes: Route[] = [];

  for (const fileFullPath of files) {
    const file = fileFullPath.replace(config.dir.routes, '');
    const routeFullPath = join(config.dir.routes, file);
    const routeBuilder: RouteBuilder = require(routeFullPath).default;
    const routeConfig = routeBuilder['getConfig']();
    const routeBase = mapFileToRouteBase(file);

    const template = `${join(config.dir.views, 'routes', routeBase.name)}.njk`;
    const i18nEnabled = routeConfig.i18nEnabled;
    const getInstances: GetRouteInstancesFn = routeConfig.getInstances ?? getInstancesDefault;
    const getData: GetDataFn = routeConfig.getData ?? getDataDefault;
    const render: RenderFn = routeConfig.render ?? renderDefault(nunjucks);
    const permalink = routeConfig.getPermalink ? await routeConfig.getPermalink() : routeBase.internalURL;
    const priority = routeConfig.priority;

    if (routeBase.isDynamic && !routeConfig.getInstances) {
      throw new Error(`Route "${routeBase.name}" is dynamic but it's missing "getInstances()"`);
    }

    if (!i18nEnabled && !['string', 'function'].includes(typeof permalink)) {
      throw new Error(`Route "${routeBase.name}" has i18n disabled, but "getPermalink()" returns an object. Return a string instead.`);
    }

    routes.push(new Route(
      routeBase.name,
      routeBase.file,
      routeBase.internalURL,
      routeBase.regex,
      routeBase.isCatchAll,
      routeBase.isDynamic,
      template,
      i18nEnabled,
      permalink,
      priority,
      routeConfig.paramDefaults,
      config,
      getInstances,
      getData,
      render,
    ));
  }

  // Sort routes by priority ASC
  routes.sort((a, b) => a.priority - b.priority);

  return new RouteCollection(routes);
}

export function getPermalinkValue(permalink: RoutePermalink, defaultValue: string, instance: RouteInstanceConfig): string {
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

export function replaceParams(url: string, params: RouteParams, defaults: RouteParams): string {
  const urlParams = getURLParams(url).reverse();
  const unmatched: string[] = [];

  // We replace from last to first, while what we're replacing is default this will be true
  // as soon as a replacement is not the default, change this to `false`
  let canReplaceDefault = true;

  urlParams.forEach(({ token, isCatchAll, name }) => {
    if (name in params) {
      // [param] & [...param] are treated the same, we convert everything to arrays
      const values: string[] = isCatchAll ? params[name] as string[] : [params[name] as string];
      const defaultValues: string[] = defaults[name] ? (isCatchAll ? defaults[name] as string[] : [defaults[name] as string]) : [];

      // Zip values and & defaultValues: [[v, d], [v, d], ...]
      const zip = values.map((v, idx) => [v, defaultValues[idx]]).reverse();
      const result: string[] = [];

      zip.forEach(([value, defaultValue]) => {
        if (value === defaultValue && canReplaceDefault) {
          result.push('');
        } else {
          canReplaceDefault = false;
          result.push(value);
        }
      });

      url = url.replace(token, result.reverse().join('/'));
    } else {
      unmatched.push(name);
    }
  });

  // Check if there are unmatched params
  if (unmatched.length > 0) {
    throw new Error(`Unmatched URL parameters: ${unmatched.map(um => `"${um}"`).join(', ')}.`);
  }

  // Remove repeated slashes
  url = url.replace(/\/\/+/g, '/')

  return addTrailingSlash(url);
}

// Prefix locale for i18n routes
export function prependLocale(url: string, config: I18nConfig, locale?: string): string {
  if (!!locale && (config.strategy === I18nStrategy.Prefix || locale !== config.defaultLocale)) {
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

export function validateRouteEntries(routes: Iterable<RouteBaseConfig>): RouteIssue[] {
  const matches = new Map<string, string[]>();

  for (const { name, internalURL } of routes) {
    for (const route of routes) {
      if (route.regex.test(internalURL)) {
        matches.set(name, (matches.get(name) ?? []).concat(route.name));
      }
    }
  }

  return Array.from(matches.entries())
    .filter(([, matches]) => matches.length > 1)
    .map(([name, matches]) => ({ name, matches }));
}
