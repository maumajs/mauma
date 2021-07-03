import { MaumaConfig } from './public/types';
import { RouteInstance, RouteParams, RouteRenderTask } from './routes';

export interface RenderContext<Data = any> {
  config: MaumaConfig;
  data?: Data;
  params: RouteParams;
  locale?: string;
}

export type GetDataFn<Data = any> = (params: RouteParams) => Promise<Data>;
export type GetRouteInstancesFn<Data = any> = () => Promise<RouteInstance<Data>[]>;
export type GetI18NPermalinksFn = () => Promise<Record<string, string>>;
export type GetI18NMessagesFn = () => Promise<Record<string, string>>;
export type GetOutputFileFn = (params: { config: MaumaConfig, task: RouteRenderTask }) => Promise<string>;
export type RenderFn<Data = any> = (ctx: RenderContext<Data>) => Promise<string>;

export interface RouteConfig<Data = any> {
  i18nEnabled: boolean;
  getData?: GetDataFn<Data>;
  getRouteInstances?: GetRouteInstancesFn<Data>;
  getI18NMessages?: GetI18NMessagesFn;
  getI18NPermalinks?: GetI18NPermalinksFn;
  getOutputFile?: GetOutputFileFn;
  render?: RenderFn<Data>;
}

export class RouteBuilder<Data = any> {
  private i18nEnabled = true;
  private getDataFn?: GetDataFn<Data>;
  private getRouteInstancesFn?: GetRouteInstancesFn<Data>;
  private getI18NMessagesFn?: GetI18NMessagesFn;
  private getI18NPermalinksFn?: GetI18NPermalinksFn;
  private getOutputFileFn?: GetOutputFileFn;
  private renderFn?: RenderFn<Data>;

  private getRouteConfig(): RouteConfig<Data> {
    return {
      i18nEnabled: this.i18nEnabled,
      getData: this.getDataFn,
      getRouteInstances: this.getRouteInstancesFn,
      getI18NMessages: this.getI18NMessagesFn,
      getI18NPermalinks: this.getI18NPermalinksFn,
      getOutputFile: this.getOutputFileFn,
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

  public getRouteInstances(fn: GetRouteInstancesFn<Data>): RouteBuilder<Data> {
    this.getRouteInstancesFn = fn;
    return this;
  }

  public getI18NMessages(fn: GetI18NMessagesFn): RouteBuilder<Data> {
    this.getI18NMessagesFn = fn;
    return this;
  }

  public getI18NPermalinks(fn: GetI18NPermalinksFn): RouteBuilder<Data> {
    this.getI18NPermalinksFn = fn;
    return this;
  }

  public getOutputFile(fn: GetOutputFileFn): RouteBuilder<Data> {
    this.getOutputFileFn = fn;
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
