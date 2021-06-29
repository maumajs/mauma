export enum i18nStrategy {
  Prefix = 'prefix',
  PrefixExceptDefault = 'prefix_except_default',
}

export interface Config {
  i18n: {
    locales: string[];
    defaultLocale: string;
    strategy: i18nStrategy;
  };
}
