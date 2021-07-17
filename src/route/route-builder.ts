import { GetDataFn, GetPermalinkFn, GetRouteInstancesFn, RenderFn, RouteBuilderConfig, RouteParams } from './types';

export class RouteBuilder<Data = any> {
  private i18nEnabled = true;
  private name?: string;
  private getDataFn?: GetDataFn<Data>;
  private getInstancesFn?: GetRouteInstancesFn<Data>;
  private getPermalinkFn?: GetPermalinkFn;
  private paramDefaults: RouteParams = {};
  private priority = 0;
  private renderFn?: RenderFn<Data>;

  private getConfig(): RouteBuilderConfig<Data> {
    return {
      i18nEnabled: this.i18nEnabled,
      name: this.name,
      getData: this.getDataFn,
      getInstances: this.getInstancesFn,
      getPermalink: this.getPermalinkFn,
      paramDefaults: this.paramDefaults,
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

  public setName(name: string): RouteBuilder<Data> {
    this.name = name;
    return this;
  }

  public setParamDefaults(paramDefaults: RouteParams): RouteBuilder<Data> {
    this.paramDefaults = paramDefaults;
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
