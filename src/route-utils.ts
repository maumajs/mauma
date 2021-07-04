import globby from 'globby';
import { join } from 'path';
import { stat } from 'fs/promises';
import { RouteConfig } from './route-builder';

export type RouteParams = Record<string, string | string[]>;

export interface RouteEntry {
  name: string;
  file: string;
  regex: RegExp;
  isCatchAll: boolean;
  isDynamic: boolean;
}

export interface RouteInstance<Data = any> {
  params: RouteParams;
  locale?: string;
  data?: Data;
}

export interface RouteRenderTask<Data = any> {
  route: RouteEntry;
  config: RouteConfig;
  instance: RouteInstance<Data>;
}

export interface RouteIssue {
  file: string;
  matches: string[];
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

export function getRouteRegexStr(file: string): string {
  // Replace [param] or [...param] with named group regex
  const internalURL = getRouteURL(file);
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

export function mapRouteFileToRouteEntry(file: string): RouteEntry {
  const regex = new RegExp(getRouteRegexStr(file));
  const name = getRouteName(file);
  const isCatchAll = file.includes('[...');
  const isDynamic = file.includes('[');

  return { name, file, regex, isCatchAll, isDynamic };
}

export async function getRouteEntries(dir: string): Promise<RouteEntry[]> {
  // Remove all trailing slashes
  dir = dir.replace(/\/+$/, '');

  // Check if it's a valid directory
  const dirStat = await stat(dir);

  if (!dirStat.isDirectory()) {
    throw new Error(`The directory "${dir}" doesn't exist.`);
  }

  // Process directory
  const files = await globby([join(dir, '/**/*.ts')]);
  return files.map(file => {
    file = file.replace(dir, '');
    return mapRouteFileToRouteEntry(file);
  });
}

export function validateRouteEntries(routes: RouteEntry[]): RouteIssue[] {
  const files = routes.map(route => route.file);
  const matches = new Map<string, string[]>();

  files.forEach(file => {
    routes.forEach(route => {
      const url = getRouteURL(file);

      if (route.regex.test(url)) {
        matches.set(file, (matches.get(file) ?? []).concat(route.file));
      }
    });
  });

  return Array.from(matches.entries())
    .filter(([, matches]) => matches.length > 1)
    .map(([file, matches]) => ({ file, matches }));
}
