import { Environment } from 'nunjucks';
import { RouteCollection } from 'route/route-collection';

export enum I18nStrategy {
  Prefix = 'prefix',
  PrefixExceptDefault = 'prefix_except_default',
}

export interface Locale {
  code: string;
  [key: string]: any; // Allow extra properties
}

export interface Translations {
  [key: string]: string | Translations;
}

export type ConfigFn = () => Promise<UserConfig>;
export type LocaleTranslations = Record<string, Translations>;

export interface I18nConfig {
  locales: Locale[];
  defaultLocale: string;
  strategy: I18nStrategy;
  translations?: LocaleTranslations;
}

export interface DirsConfig {
  build: string;
  client: string;
  routes: string;
  scss: string;
  views: string;
}

export interface UserConfig {
  configureNunjucks?(nunjucks: Environment, config: Config, routes: RouteCollection): void;
  dir?: Partial<DirsConfig>;
  i18n: I18nConfig;
}

export interface Config extends Omit<UserConfig, 'configureNunjucks'> {
  dir: DirsConfig;
}
