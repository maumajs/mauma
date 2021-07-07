export enum MaumaI18NStrategy {
  Prefix = 'prefix',
  PrefixExceptDefault = 'prefix_except_default',
}

export interface MaumaLocale {
  code: string;
  [key: string]: any; // Allow extra properties
}

export interface MaumaI18NConfig {
  locales: MaumaLocale[];
  defaultLocale: string;
  strategy: MaumaI18NStrategy;
}

export interface MaumaConfig {
  // dir?: {
  //   routes?: string;
  //   views?: string;
  // };
  i18n: MaumaI18NConfig;
}
