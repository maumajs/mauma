import { MaumaTranslations, MaumaTranslationValues } from '../public/types';
import { RouteInstanceI18nMap } from '../route/utils';

export function hasLocale(i18nMap: RouteInstanceI18nMap, key: string, locale: string): boolean {
  if (i18nMap.has(key)) {
    return i18nMap.get(key)!.has(locale);
  }

  return false;
}

export function getTranslation(key: string, translations: MaumaTranslationValues): string {
  const isLeaf = !key.includes('.');

  if (isLeaf) {
    if (typeof translations[key] === 'string') {
      return translations[key] as string;
    }

    throw new Error(`"${key}" not present or translation value is not "string".`);
  } else {
    const [first, ...rest] = key.split('.');

    if (first in translations && typeof translations[first] === 'object') {
      return getTranslation(rest.join('.'), translations[first] as MaumaTranslationValues);
    }

    throw new Error(`"${first}" not present or translation value is "string"`);
  }
}

export function translate(key: string, replacements: Record<string, any>, translations?: MaumaTranslations, locale?: string): string {
  if (locale && translations) {
    try {
      let translation = getTranslation(key, translations[locale]);

      Object.entries(replacements).forEach(([key, value]) => {
        translation = translation.replace(`{{${key}}}`, value);
      });

      return translation;
    } catch { }
  }

  return key;
}
