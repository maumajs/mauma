import { join } from 'path';
import {
  getRouteName,
  getRouteRegexStr,
  getRouteEntries,
  mapRouteFileToRouteEntry,
  validateRouteEntries,
  getRouteURL
} from '../src/routes';

// interface GetRouteOutputTest {
//   entry: RouteEntry;
//   instance: RouteInstance;
//   output: string;
// }

describe('Routes directory parsing', () => {
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

  // describe('getRouteOutput', () => {
  //   it('should return the relative output file name', () => {
  //     const tests: GetRouteOutputTest[] = [
  //       {
  //         entry: mapRouteFileToRouteEntry('/index.ts'),
  //         instance: { params: {} },
  //         output: '/index.html',
  //       },
  //       {
  //         entry: mapRouteFileToRouteEntry('/us/about.ts'),
  //         instance: { params: {} },
  //         output: '/us/about/index.html',
  //       },
  //     ];

  //     tests.forEach(test => {
  //       expect(getRouteOutput(test.entry, test.instance)).toBe(test.output);
  //     });
  //   });
  // });

  describe('validateRouteEntries', () => {
    it(`should return an empty array if there aren't conflicts`, () => {
      const routes = [
        '/index.ts',
        '/us/about.ts',
        '/products/[...all].ts',
        '/blog/[year]/[month]/[slug].ts',
      ].map(file => mapRouteFileToRouteEntry(file));

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
      ].map(file => mapRouteFileToRouteEntry(file));

      const issues = validateRouteEntries(routes);
      expect(issues).toEqual([
        {
          file: '/blog/[...all].ts',
          matches: ['/blog/[...all].ts', '/blog/[...params].ts'],
        },
        {
          file: '/blog/[...params].ts',
          matches: ['/blog/[...all].ts', '/blog/[...params].ts'],
        },
        {
          file: '/blog/[year]/[slug].ts',
          matches: ['/blog/[...all].ts', '/blog/[...params].ts', '/blog/[year]/[slug].ts'],
        },
        {
          file: '/blog/[year]/[month]/[slug].ts',
          matches: ['/blog/[...all].ts', '/blog/[...params].ts', '/blog/[year]/[month]/[slug].ts'],
        },
      ]);
    });
  });

  describe('getRouteRegex', () => {
    it('should return a working regex given a file name', () => {
      const tests = [
        {
          file: '/index.ts',
          regex: '^/$',
          testsPass: ['/'],
          testsFail: ['/us/about'],
        },
        {
          file: '/us/about.ts',
          regex: '^/us/about$',
          testsPass: ['/us/about'],
          testsFail: ['/'],
        },
        {
          file: '/blog/index.ts',
          regex: '^/blog$',
          testsPass: ['/blog'],
          testsFail: ['/us/about'],
        },
        {
          file: '/blog/[year]/[month]/[slug].ts',
          regex: '^/blog/(?<year>[^?/]+)/(?<month>[^?/]+)/(?<slug>[^?/]+)$',
          testsPass: ['/blog/2021/06/mauma-ssg'],
          testsFail: ['/', '/blog', '/us/about'],
        },
        {
          file: '/blog/[...all].ts',
          regex: '^/blog/(?<all>[^?]+)$',
          testsPass: ['/blog/2021', '/blog/2021/06', '/blog/2021/06/mauma-ssg'],
          testsFail: ['/', '/blog', '/us/about'],
        },
      ];

      tests.forEach(entry => {
        const regexStr = getRouteRegexStr(entry.file);
        const regex = new RegExp(regexStr);

        expect(regexStr).toEqual(entry.regex);

        entry.testsPass.forEach(url => expect({ url, regexStr, result: regex.test(url) }).toEqual({ url, regexStr, result: true }));
        entry.testsFail.forEach(url => expect({ url, regexStr, result: regex.test(url) }).toEqual({ url, regexStr, result: false }));
      });
    });
  });

  describe('mapRouteFileToRouteEntry', () => {
    it('should map simple routes', () => {
      const route = mapRouteFileToRouteEntry('/us/about.ts');

      expect(route.name).toBe('us-about');
      expect(route.isCatchAll).toBe(false);
      expect(route.isDynamic).toBe(false);
    });

    it('should map dynamic routes with separate params, e.g. [param]', () => {
      const route = mapRouteFileToRouteEntry('/blog/[year]/[month]/[slug].ts');

      expect(route.name).toBe('blog-year-month-slug');
      expect(route.isCatchAll).toBe(false);
      expect(route.isDynamic).toBe(true);
    });

    it('should map dynamic routes with spread params, e.g. [...param]', () => {
      const route = mapRouteFileToRouteEntry('/blog/[...all].ts');

      expect(route.name).toBe('blog-all');
      expect(route.isCatchAll).toBe(true);
      expect(route.isDynamic).toBe(true);
    });
  });

  describe('getRouteEntries', () => {
    it(`should fail if the directory doesn't exist`, () => {
      expect(getRouteEntries('this-directory-doesnt-exist')).rejects.toThrow();
    });

    it(`should handle trailing slashes`, async () => {
      await getRouteEntries(join(__dirname, './fixtures/routes') + '//');
    });

    it(`should return a list of routes`, async () => {
      const routes = await getRouteEntries(join(__dirname, 'fixtures/routes'));
      const names = routes.map(route => route.name);

      expect(names).toEqual([
        'index',
        'us-about',
        'blog-year-month-slug',
      ]);
    });
  });
});
