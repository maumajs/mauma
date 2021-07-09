export enum MaumaI18NStrategy {
  Prefix = 'prefix',
  PrefixExceptDefault = 'prefix_except_default',
}

export interface MaumaLocale {
  code: string;
  [key: string]: any; // Allow extra properties
}

export interface MaumaTranslations {
  [key: string]: string; // | MaumaTranslations;
}

export interface MaumaI18NConfig {
  locales: MaumaLocale[];
  defaultLocale: string;
  strategy: MaumaI18NStrategy;
  translations?: Record<string, MaumaTranslations>;
}

export interface MaumaConfig {
  // dir?: {
  //   routes?: string;
  //   views?: string;
  // };
  i18n: MaumaI18NConfig;
}
