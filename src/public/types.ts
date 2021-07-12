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

export type ConfigFn = () => Promise<Config>;
export type LocaleTranslations = Record<string, Translations>;

export interface I18nConfig {
  locales: Locale[];
  defaultLocale: string;
  strategy: I18nStrategy;
  translations?: LocaleTranslations;
}

export interface Config {
  // dir?: {
  //   routes?: string;
  //   views?: string;
  // };
  i18n: I18nConfig;
}
