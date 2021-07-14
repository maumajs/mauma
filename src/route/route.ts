import { Config } from 'public/types';
import { RouteCollection } from './route-collection';
import { RouteInstance } from './route-instance';
import { RouteInstanceI18nMap, RoutePermalink, GetRouteInstancesFn, GetDataFn, RenderFn, RenderContext } from './types';
import { appendIndexHTML, getPermalink, makeIterator } from './utils';

export class Route implements Iterable<RouteInstance> {
  public readonly i18nMap: RouteInstanceI18nMap = new Map();

  private instances: RouteInstance[] = [];
  private routes!: RouteCollection;

  constructor(
    public readonly name: string,
    public readonly file: string,
    public readonly internalURL: string,
    public readonly regex: RegExp,
    public readonly isCatchAll: boolean,
    public readonly isDynamic: boolean,
    public readonly template: string,
    public readonly i18nEnabled: boolean,
    public readonly permalink: RoutePermalink,
    public readonly priority: number,
    private readonly config: Config,
    private readonly getInstancesFn: GetRouteInstancesFn,
    private readonly getDataFn: GetDataFn,
    private readonly renderFn: RenderFn,
  ) { }

  public [Symbol.iterator](): Iterator<RouteInstance, any, undefined> {
    return makeIterator(this.instances);
  }

  public getInstances(): RouteInstance[] {
    return this.instances;
  }

  private async loadInstances(): Promise<void> {
    const instancesCfg = await this.getInstancesFn({ config: this.config, route: this, routes: this.routes });

    for (const instanceCfg of instancesCfg) {
      // Get instance data
      // It's important to load ALL the data before rendering
      const data = await this.getDataFn(instanceCfg);
      const permalink = getPermalink(this.config.i18n, this, instanceCfg);
      const output = appendIndexHTML(permalink);
      const instance = new RouteInstance(
        instanceCfg.key,
        instanceCfg.locale,
        instanceCfg.params,
        data,
        permalink,
        output,
      );

      // Set related i18n instances map
      if (!this.i18nMap.has(instance.key)) {
        this.i18nMap.set(instance.key, new Map());
      }

      if (this.i18nMap.has(instance.key) && instance.locale) {
        this.i18nMap.get(instance.key)!.set(instance.locale, instance);
      }

      this.instances.push(instance);
    }
  }

  private setRoutes(routes: RouteCollection): void {
    this.routes = routes;
  }

  public render(ctx: RenderContext): Promise<string> {
    return this.renderFn(ctx);
  }
}
