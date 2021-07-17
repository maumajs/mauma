import { Environment } from 'nunjucks';
import { RouteCollection } from '../route/route-collection';
import { Config } from '../public/types';
import { hasLocale, translate } from './globals';
import { RenderContext, RouteInstanceConfig, RouteParams } from '../route/types';

interface NunjucksThis {
  env: Environment;
  ctx: RenderContext;
}

export function configureNunjucks(nunjucks: Environment, config: Config, routes: RouteCollection): void {
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
        return route.getPermalink(translation);
      }
    }

    return '';
  });

  nunjucks.addGlobal('url', function (this: NunjucksThis, name: string, params?: RouteParams, locale?: string): string {
    const route = routes.get(name);

    if (route) {
      return route.getPermalink({
        key: route.name,
        locale: locale ?? this.ctx.locale,
        params: params ?? {},
      });
    }

    return '';
  });
}
