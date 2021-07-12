import { LocaleTranslations } from 'index';
import { translate } from '../../src/view/globals';

describe('View Globals', () => {
  describe('hasLocale', () => {
  });

  describe('translate', () => {
    const translations: LocaleTranslations = {
      en: {
        foo: 'bar',
        variable: '{{var}}',
        bar: {
          baz: {
            foo: '42',
          },
        }
      }
    };

    it(`should return "key" as is if locale/translations are undefined, or key doesn't exist`, () => {
      // `locale` and/or `translations` = undefined
      expect(translate('foo', {})).toBe('foo');
      expect(translate('foo', {}, undefined, 'en')).toBe('foo');
      expect(translate('foo', {}, translations)).toBe('foo');

      // `key` doesn't exist
      expect(translate('whatever', {}, translations, 'en')).toBe('whatever');
    });

    it(`should do basic translations`, () => {
      expect(translate('foo', {}, translations, 'en')).toBe('bar');
      expect(translate('variable', {}, translations, 'en')).toBe('{{var}}');
    });

    it(`should handle nested objects in translations (key "path" with dot separator)`, () => {
      // Return the value if the full path matches
      expect(translate('bar.baz.foo', {}, translations, 'en')).toBe('42');

      // Partial paths return "key" as they are not matches
      expect(translate('bar.baz', {}, translations, 'en')).toBe('bar.baz');
      expect(translate('this.doesnt.exist', {}, translations, 'en')).toBe('this.doesnt.exist');
    });

    it(`should replace variables (eg. {{var}})`, () => {
      expect(translate('variable', { var: 42 }, translations, 'en')).toBe('42');
      expect(translate('variable', { foo: 1337 }, translations, 'en')).toBe('{{var}}');
    });
  });
});
