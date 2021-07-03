export enum MaumaI18NStrategy {
  Prefix = 'prefix',
  PrefixExceptDefault = 'prefix_except_default',
}

export interface MaumaLocale {
  code: string;
  [key: string]: any; // Allow extra properties
}

export interface MaumaConfig {
  // dir?: {
  //   routes?: string;
  //   views?: string;
  // };
  i18n: {
    locales: MaumaLocale[];
    defaultLocale: string;
    strategy: MaumaI18NStrategy;
  };
}
