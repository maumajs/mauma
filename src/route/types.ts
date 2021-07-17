import { Config } from '../public/types';
import { Route } from './route';
import { RouteCollection } from './route-collection';
import { RouteInstance } from './route-instance';

export type RoutePermalink = string | Record<string, string> | ((instance: RouteInstanceConfig) => string);
export type RouteParams = Record<string, string | string[]>;
export type RouteInstanceI18nMap = Map<string, Map<string, RouteInstance>>;

export interface RouteParamConfig {
  isCatchAll: boolean;
  name: string;
  token: string;
}

export interface RouteBaseConfig {
  readonly name: string;
  readonly file: string;
  readonly internalURL: string;
  readonly regex: RegExp;
  readonly isCatchAll: boolean;
  readonly isDynamic: boolean;
}

export interface RouteInstanceConfig<Data = any> {
  key: string;
  locale?: string;
  params: RouteParams;
  data?: Data;
}

export interface RouteIssue {
  name: string;
  matches: string[];
}

export interface RenderContext<Data = any> {
  config: Config;
  routes: RouteCollection;
  route: Route;
  instance: RouteInstance;
  locale?: string;
  params: RouteParams,
  data?: Data;
}

export interface GetRouteInstancesFnParams {
  config: Config;
  routes: RouteCollection;
  route: Route;
}

export type GetDataFn<Data = any> = (instance: RouteInstanceConfig<Data>) => Promise<Data>;
export type GetRouteInstancesFn<Data = any> = (params: GetRouteInstancesFnParams) => Promise<RouteInstanceConfig<Data>[]>;
export type GetPermalinkFn = () => Promise<RoutePermalink>;
export type RenderFn<Data = any> = (ctx: RenderContext<Data>) => Promise<string>;

export interface RouteBuilderConfig<Data = any> {
  i18nEnabled: boolean;
  getData?: GetDataFn<Data>;
  getInstances?: GetRouteInstancesFn<Data>;
  getPermalink?: GetPermalinkFn;
  paramDefaults: RouteParams;
  priority: number;
  render?: RenderFn<Data>;
}
