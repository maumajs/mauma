import { join } from 'path';
import { I18nConfig, I18nStrategy } from '../../src/public/types';
import {
  addTrailingSlash,
  appendIndexHTML,
  getInternalURLRegexStr,
  getPermalinkValue,
  getRouteFiles,
  getRouteName,
  getRouteURL,
  mapFileToRouteBase,
  prependLocale,
  replaceParams,
  RouteInstanceBase,
  RoutePermalink,
  validateRouteEntries,
} from '../../src/route/utils';

describe('Route Utilities', () => {
  describe('appendIndexHTML', () => {
    it(`should append index.html when necessary`, () => {
      expect(appendIndexHTML('/')).toEqual('/index.html');
      expect(appendIndexHTML('/index.html')).toEqual('/index.html');
      expect(appendIndexHTML('/us')).toEqual('/us/index.html');
      expect(appendIndexHTML('/us/about')).toEqual('/us/about/index.html');
      expect(appendIndexHTML('/us/about/')).toEqual('/us/about/index.html');
      expect(appendIndexHTML('/us/about.html')).toEqual('/us/about.html');
      expect(appendIndexHTML('/us/about.html/')).toEqual('/us/about.html/index.html');
      expect(appendIndexHTML('/[...all]')).toEqual('/[...all]/index.html');
      expect(appendIndexHTML('/sitemap.xml')).toEqual('/sitemap.xml');
    });
  });

  describe('addTrailingSlash', () => {
    it(`should append index.html when necessary`, () => {
      expect(addTrailingSlash('/')).toEqual('/');
      expect(addTrailingSlash('/index.html')).toEqual('/index.html');
      expect(addTrailingSlash('/us')).toEqual('/us/');
      expect(addTrailingSlash('/us/about')).toEqual('/us/about/');
      expect(addTrailingSlash('/us/about/')).toEqual('/us/about/');
      expect(addTrailingSlash('/us/about.html')).toEqual('/us/about.html');
      expect(addTrailingSlash('/sitemap.xml')).toEqual('/sitemap.xml');
    });
  });

  describe('getRouteURL', () => {
    it('should transform a file name to an URL', () => {
      const tests = [
        { file: '/index.ts', url: '/' },
        { file: '/us/about.ts', url: '/us/about' },
        { file: '/blog/index.ts', url: '/blog' },
        { file: '/blog/[month]/[slug].ts', url: '/blog/[month]/[slug]' },
        { file: '/blog/[...all].ts', url: '/blog/[...all]' },
      ];

      tests.forEach(({ file, url }) => {
        expect(getRouteURL(file)).toBe(url);
      });
    });
  });

  describe('getRouteName', () => {
    it('should return a name given a file name', () => {
      expect(getRouteName('/index.ts')).toEqual('index');
      expect(getRouteName('/us/about.ts')).toEqual('us-about');
      expect(getRouteName('/blog/index.ts')).toEqual('blog-index');
      expect(getRouteName('/blog/[year]/[month]/[slug].ts')).toEqual('blog-year-month-slug');
      expect(getRouteName('/blog/[...all].ts')).toEqual('blog-all');
    });
  });

  describe('validateRouteEntries', () => {
    it(`should return an empty array if there aren't conflicts`, () => {
      const routes = [
        '/index.ts',
        '/us/about.ts',
        '/products/[...all].ts',
        '/blog/[year]/[month]/[slug].ts',
      ].map(file => mapFileToRouteBase(file));

      const issues = validateRouteEntries(routes);
      expect(issues).toEqual([]);
    });

    it(`should detect conflicts between [...param] & [param] on the same path`, () => {
      const routes = [
        '/index.ts',
        '/blog/[...all].ts',
        '/blog/[...params].ts',
        '/blog/[year]/[slug].ts',
        '/blog/[year]/[month]/[slug].ts',
      ].map(file => mapFileToRouteBase(file));

      const issues = validateRouteEntries(routes);
      expect(issues).toEqual([
        {
          name: 'blog-all',
          matches: ['blog-all', 'blog-params'],
        },
        {
          name: 'blog-params',
          matches: ['blog-all', 'blog-params'],
        },
        {
          name: 'blog-year-slug',
          matches: ['blog-all', 'blog-params', 'blog-year-slug'],
        },
        {
          name: 'blog-year-month-slug',
          matches: ['blog-all', 'blog-params', 'blog-year-month-slug'],
        },
      ]);
    });
  });

  describe('getInternalURLRegexStr', () => {
    it('should return a working regex given an URL', () => {
      const tests = [
        {
          internalURL: '/',
          regex: '^/$',
          testsPass: ['/'],
          testsFail: ['/us/about'],
        },
        {
          internalURL: '/us/about',
          regex: '^/us/about$',
          testsPass: ['/us/about'],
          testsFail: ['/'],
        },
        {
          internalURL: '/blog',
          regex: '^/blog$',
          testsPass: ['/blog'],
          testsFail: ['/us/about'],
        },
        {
          internalURL: '/blog/[year]/[month]/[slug]',
          regex: '^/blog/(?<year>[^?/]+)/(?<month>[^?/]+)/(?<slug>[^?/]+)$',
          testsPass: ['/blog/2021/06/mauma-ssg'],
          testsFail: ['/', '/blog', '/us/about'],
        },
        {
          internalURL: '/blog/[...all]',
          regex: '^/blog/(?<all>[^?]+)$',
          testsPass: ['/blog/2021', '/blog/2021/06', '/blog/2021/06/mauma-ssg'],
          testsFail: ['/', '/blog', '/us/about'],
        },
      ];

      tests.forEach(entry => {
        const regexStr = getInternalURLRegexStr(entry.internalURL);
        const regex = new RegExp(regexStr);

        expect(regexStr).toEqual(entry.regex);

        entry.testsPass.forEach(url => expect({ url, regexStr, result: regex.test(url) }).toEqual({ url, regexStr, result: true }));
        entry.testsFail.forEach(url => expect({ url, regexStr, result: regex.test(url) }).toEqual({ url, regexStr, result: false }));
      });
    });
  });

  describe('mapFileToRouteBase', () => {
    it('should map simple routes', () => {
      const route = mapFileToRouteBase('/us/about.ts');
      expect(route.name).toBe('us-about');
      expect(route.file).toBe('/us/about.ts');
      expect(route.internalURL).toBe('/us/about');
      expect(route.isCatchAll).toBe(false);
      expect(route.isDynamic).toBe(false);
    });

    it('should map dynamic routes with separate params, e.g. [param]', () => {
      const route = mapFileToRouteBase('/blog/[year]/[month]/[slug].ts');
      expect(route.name).toBe('blog-year-month-slug');
      expect(route.file).toBe('/blog/[year]/[month]/[slug].ts');
      expect(route.internalURL).toBe('/blog/[year]/[month]/[slug]');
      expect(route.isCatchAll).toBe(false);
      expect(route.isDynamic).toBe(true);
    });

    it('should map dynamic routes with spread params, e.g. [...param]', () => {
      const route = mapFileToRouteBase('/blog/[...all].ts');
      expect(route.name).toBe('blog-all');
      expect(route.file).toBe('/blog/[...all].ts');
      expect(route.internalURL).toBe('/blog/[...all]');
      expect(route.isCatchAll).toBe(true);
      expect(route.isDynamic).toBe(true);
    });
  });

  describe('getPermalinkValue', () => {
    const instance: (locale: string) => RouteInstanceBase = (locale) => ({
      key: '',
      locale,
      params: {},
      data: { foo: 42 }
    });

    it(`should work with a string`, () => {
      const permalink: RoutePermalink = '/us/about';
      expect(getPermalinkValue(permalink, 'default', instance('en'))).toBe('/us/about');
    });

    it(`should work with a function`, () => {
      const permalink: RoutePermalink = ({ data }) => `/us/about/${data.foo}`;
      expect(getPermalinkValue(permalink, 'default', instance('en'))).toBe('/us/about/42');
    });

    it(`should work with a locales map`, () => {
      const permalink: RoutePermalink = {
        es: '/nosotros/quienes-somos',
      };

      expect(getPermalinkValue(permalink, 'default', instance('es'))).toBe('/nosotros/quienes-somos');
    });

    it(`should return the default value if the locale doesn't have any value`, () => {
      const permalink: RoutePermalink = {
        es: '/nosotros/quienes-somos',
      };

      expect(getPermalinkValue(permalink, '/us/about', instance('en'))).toBe('/us/about');
    });
  });

  describe('replaceParams', () => {
    it(`should replace the parameters`, () => {
      expect(replaceParams('/', {})).toBe('/');
      expect(replaceParams('/us/about', {})).toBe('/us/about');
      expect(replaceParams('/blog/[slug]', { slug: 'lorem-ipsum' })).toBe('/blog/lorem-ipsum');
      expect(replaceParams('/blog/[...all]', { all: ['foo', '42', 'bar'] })).toBe('/blog/foo/42/bar');
    });

    it(`should throw an error if the param is missing`, () => {
      expect(() => {
        replaceParams('/blog/[slug]', {});
      }).toThrow();
    });
  });

  describe('prependLocale', () => {
    describe('Prefix', () => {
      const config: I18nConfig = {
        defaultLocale: 'en',
        locales: [{ code: 'en' }, { code: 'es' }],
        strategy: I18nStrategy.Prefix,
      };

      it(`should prefix always`, () => {
        expect(prependLocale('/us/about', config, 'en')).toBe('/en/us/about');
        expect(prependLocale('/us/about', config, 'ca')).toBe('/ca/us/about');
      });

      it(`shouldn't prefix if locale param is missing`, () => {
        expect(prependLocale('/us/about', config)).toBe('/us/about');
      });
    });

    describe('PrefixExceptDefault', () => {
      const config: I18nConfig = {
        defaultLocale: 'en',
        locales: [{ code: 'en' }, { code: 'es' }],
        strategy: I18nStrategy.PrefixExceptDefault,
      };

      it(`should prefix only non default locales`, () => {
        expect(prependLocale('/us/about', config, 'en')).toBe('/us/about');
        expect(prependLocale('/us/about', config, 'es')).toBe('/es/us/about');
        expect(prependLocale('/us/about', config, 'ca')).toBe('/ca/us/about');
      });

      it(`shouldn't prefix if locale param is missing`, () => {
        expect(prependLocale('/us/about', config)).toBe('/us/about');
      });
    });
  });

  describe('getRouteFiles', () => {
    const fixturesDir = join(__dirname, '../fixtures/routes');

    it(`should fail if the directory doesn't exist`, () => {
      expect(getRouteFiles('this-directory-doesnt-exist')).rejects.toThrow();
    });

    it(`should handle trailing slashes`, async () => {
      await getRouteFiles(fixturesDir + '//');
    });

    it(`should return a list of routes`, async () => {
      const routes = await getRouteFiles(fixturesDir);
      const fixture = (file: string) => join(fixturesDir, file);

      expect(routes).toEqual([
        fixture('/index.ts'),
        fixture('/us/about.ts'),
        fixture('/blog/[year]/[month]/[slug].ts'),
      ]);
    });
  });
});
