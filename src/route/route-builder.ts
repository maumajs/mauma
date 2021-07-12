import { Config } from '../public/types';
import { Route, RouteInstanceBase, RouteParams, RoutePermalink } from './utils';

export interface RenderContext<Data = any> {
  config: Config;
  route: Route;
  instance: RouteInstanceBase;
  locale?: string;
  params: RouteParams,
  data?: Data;
}

export interface GetRouteInstancesFnParams {
  config: Config;
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

export class RouteBuilder<Data = any> {
  private i18nEnabled = true;
  private getDataFn?: GetDataFn<Data>;
  private getInstancesFn?: GetRouteInstancesFn<Data>;
  private getPermalinkFn?: GetPermalinkFn;
  private priority = 0;
  private renderFn?: RenderFn<Data>;

  private getRouteConfig(): RouteConfig<Data> {
    return {
      i18nEnabled: this.i18nEnabled,
      getData: this.getDataFn,
      getInstances: this.getInstancesFn,
      getPermalink: this.getPermalinkFn,
      priority: this.priority,
      render: this.renderFn,
    };
  }

  public disableI18n(): RouteBuilder<Data> {
    this.i18nEnabled = false;
    return this;
  }

  public getData(fn: GetDataFn<Data>): RouteBuilder<Data> {
    this.getDataFn = fn;
    return this;
  }

  public getInstances(fn: GetRouteInstancesFn<Data>): RouteBuilder<Data> {
    this.getInstancesFn = fn;
    return this;
  }

  public getPermalink(fn: GetPermalinkFn): RouteBuilder<Data> {
    this.getPermalinkFn = fn;
    return this;
  }

  public render(fn: RenderFn<Data>): RouteBuilder<Data> {
    this.renderFn = fn;
    return this;
  }

  public setPriority(priority: number): RouteBuilder<Data> {
    this.priority = priority;
    return this;
  }
}

export function Route<Data = any>(): RouteBuilder<Data> {
  return new RouteBuilder<Data>();
}
