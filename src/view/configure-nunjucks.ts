import { Environment } from 'nunjucks';
import { MaumaConfig } from '../public/types';
import { RenderContext } from '../route/route-builder';
import { getPermalink, Route, RouteInstanceBase, RouteParams } from '../route/utils';
import { hasLocale, translate } from './globals';

interface NunjucksThis {
  env: Environment;
  ctx: RenderContext;
}

export function configureNunjucks(nunjucks: Environment, config: MaumaConfig, routes: Route[]): void {
  nunjucks.addGlobal('config', config);

  nunjucks.addFilter('translate', function (this: NunjucksThis, key: string, replacements: Record<string, any>): string {
    const { config, locale } = this.ctx;
    return translate(key, replacements ?? {}, config.i18n.translations, locale);
  });

  nunjucks.addGlobal('haslocale', function (this: NunjucksThis, locale: string): boolean {
    const { instance, route } = this.ctx;
    return hasLocale(route.i18nMap, instance.key, locale);
  });

  nunjucks.addGlobal('localeurl', function (this: NunjucksThis, locale: string): string {
    const { instance, route } = this.ctx;

    if (route.i18nMap.has(instance.key)) {
      if (route.i18nMap.get(instance.key)!.has(locale)) {
        const translation = route.i18nMap.get(instance.key)!.get(locale)!;
        return getPermalink(config.i18n, route, translation);
      }
    }

    return '';
  });

  nunjucks.addGlobal('url', function (this: NunjucksThis, name: string, params?: RouteParams, locale?: string): string {
    const route = routes.find(route => name === route.name);

    if (route) {
      const instance: RouteInstanceBase = {
        key: route.name,
        locale: locale ?? this.ctx.locale,
        params: params ?? {},
      };

      return getPermalink(config.i18n, route, instance);
    }

    return '';
  });
}
