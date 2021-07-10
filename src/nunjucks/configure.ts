import { Environment } from 'nunjucks';
import { MaumaConfig } from '../public/types';
import { RenderContext } from '../route/route-builder';
import { getPermalink, Route, RouteInstance, RouteParams } from '../route/utils';

interface NunjucksThis {
  env: Environment;
  ctx: RenderContext;
}

export function configureNunjucks(nunjucks: Environment, config: MaumaConfig, routes: Route[]): void {
  nunjucks.addGlobal('config', config);

  nunjucks.addFilter('translate', function (this: NunjucksThis, key: string, replacements: Record<string, any>): string {
    const { config, locale } = this.ctx;
    let translation = key;

    if (locale) {
      if (config.i18n.translations) {
        if (key in config.i18n.translations[locale]) {
          translation = config.i18n.translations[locale][key];
        }
      }
    }

    Object.entries(replacements ?? {}).forEach(([key, value]) => {
      translation = translation.replace(`{{${key}}}`, value);
    });

    return translation;
  });

  nunjucks.addGlobal('haslocale', function (this: NunjucksThis, locale: string): boolean {
    const { instance, route } = this.ctx;

    if (route.i18nMap.has(instance.key)) {
      return route.i18nMap.get(instance.key)!.has(locale);
    }

    return false;
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
      const instance: RouteInstance = {
        key: route.name,
        locale: locale ?? this.ctx.locale,
        params: params ?? {},
      };

      return getPermalink(config.i18n, route, instance);
    } else {
      return '';
    }
  });
}
