import { Config } from '../public/types';
import { Route } from './route';
import { RouteCollection } from './route-collection';
import { RouteInstance } from './route-instance';

export type RoutePermalink = string | Record<string, string> | ((instance: RouteInstanceBase) => string);
export type RouteParams = Record<string, string | string[]>;
export type RouteInstanceI18nMap = Map<string, Map<string, RouteInstanceBase>>;

export interface RouteCfgBase {
  readonly name: string;
  readonly file: string;
  readonly internalURL: string;
  readonly regex: RegExp;
  readonly isCatchAll: boolean;
  readonly isDynamic: boolean;
}

export interface RouteCfg extends RouteCfgBase {
  readonly template: string;
  readonly i18nEnabled: boolean;
  readonly i18nMap: RouteInstanceI18nMap;
  readonly permalink: RoutePermalink;
  readonly priority: number;
  readonly getInstances: GetRouteInstancesFn;
  readonly getData: GetDataFn;
  readonly render: RenderFn;
}

export interface RouteInstanceBase<Data = any> {
  key: string;
  locale?: string;
  params: RouteParams;
  data?: Data;
}

// export interface RouteInstance<Data = any> extends RouteInstanceBase<Data> {
//   data: Data;
//   permalink: string;
//   output: string;
// }

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

export type GetDataFn<Data = any> = (instance: RouteInstanceBase<Data>) => Promise<Data>;
export type GetRouteInstancesFn<Data = any> = (params: GetRouteInstancesFnParams) => Promise<RouteInstanceBase<Data>[]>;
export type GetPermalinkFn = () => Promise<RoutePermalink>;
export type RenderFn<Data = any> = (ctx: RenderContext<Data>) => Promise<string>;

export interface RouteConfig<Data = any> {
  i18nEnabled: boolean;
  getData?: GetDataFn<Data>;
  getInstances?: GetRouteInstancesFn<Data>;
  getPermalink?: GetPermalinkFn;
  priority: number;
  render?: RenderFn<Data>;
}
