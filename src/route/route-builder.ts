import { MaumaConfig, MaumaTranslations } from '../public/types';
import { Route, RouteInstance, RouteParams, RoutePermalink } from './utils';

export interface RenderContext<Data = any> {
  config: MaumaConfig;
  route: Route;
  instance: RouteInstance;
  locale?: string;
  params: RouteParams,
  data?: Data;
}

export interface GetRouteInstancesFnParams {
  config: MaumaConfig;
  route: Route;
}

export type GetDataFn<Data = any> = (instance: RouteInstance<Data>) => Promise<Data>;
export type GetRouteInstancesFn<Data = any> = (params: GetRouteInstancesFnParams) => Promise<RouteInstance<Data>[]>;
export type GetTranslationsFn = () => Promise<Record<string, MaumaTranslations>>;
export type GetPermalinkFn = () => Promise<RoutePermalink>;
export type RenderFn<Data = any> = (ctx: RenderContext<Data>) => Promise<string>;

export interface RouteConfig<Data = any> {
  i18nEnabled: boolean;
  getData?: GetDataFn<Data>;
  getInstances?: GetRouteInstancesFn<Data>;
  getTranslations?: GetTranslationsFn;
  getPermalink?: GetPermalinkFn;
  render?: RenderFn<Data>;
}

export class RouteBuilder<Data = any> {
  private i18nEnabled = true;
  private getDataFn?: GetDataFn<Data>;
  private getInstancesFn?: GetRouteInstancesFn<Data>;
  private getTranslationsFn?: GetTranslationsFn;
  private getPermalinkFn?: GetPermalinkFn;
  private renderFn?: RenderFn<Data>;

  private getRouteConfig(): RouteConfig<Data> {
    return {
      i18nEnabled: this.i18nEnabled,
      getData: this.getDataFn,
      getInstances: this.getInstancesFn,
      getTranslations: this.getTranslationsFn,
      getPermalink: this.getPermalinkFn,
      render: this.renderFn,
    };
  }

  public disableI18N(): RouteBuilder<Data> {
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

  public getTranslations(fn: GetTranslationsFn): RouteBuilder<Data> {
    this.getTranslationsFn = fn;
    return this;
  }

  public render(fn: RenderFn<Data>): RouteBuilder<Data> {
    this.renderFn = fn;
    return this;
  }
}

export function MaumaRoute<Data = any>(): RouteBuilder<Data> {
  return new RouteBuilder<Data>();
}
