import { RouteInstanceI18nMap } from '../route/types';
import { LocaleTranslations, Translations } from '../public/types';

export function hasLocale(i18nMap: RouteInstanceI18nMap, key: string, locale: string): boolean {
  if (i18nMap.has(key)) {
    return i18nMap.get(key)!.has(locale);
  }

  return false;
}

export function getTranslation(key: string, translations: Translations): string {
  const isLeaf = !key.includes('.');

  if (isLeaf) {
    if (typeof translations[key] === 'string') {
      return translations[key] as string;
    }

    throw new Error(`"${key}" not present or translation value is not "string".`);
  } else {
    const [first, ...rest] = key.split('.');

    if (first in translations && typeof translations[first] === 'object') {
      return getTranslation(rest.join('.'), translations[first] as Translations);
    }

    throw new Error(`"${first}" not present or translation value is "string"`);
  }
}

export function translate(key: string, replacements: Record<string, any>, translations?: LocaleTranslations, locale?: string): string {
  const CUT_REGEX = /:\d$/;
  let cutIdx;

  // If the key has cut index, e.g. `foo:0`
  // Get `cutIdx` and remove that part (`foo:0` => `foo`)
  if (CUT_REGEX.test(key)) {
    cutIdx = Number(key.split(':').pop()!.trim());
    key = key.replace(CUT_REGEX, '');
  }

  if (locale && translations) {
    try {
      let translation = getTranslation(key, translations[locale]);

      Object.entries(replacements).forEach(([key, value]) => {
        translation = translation.replace(`{{${key}}}`, value);
      });

      // If cut index is defined, TRY to return the desired part
      if (typeof cutIdx !== 'undefined') {
        const cuts = translation.split('|');

        if (cuts[cutIdx]) {
          return cuts[cutIdx];
        } else {
          return key;
        }
      }

      return translation;
    } catch { }
  }

  return key;
}
