import { appendIndexHTML, getURLFromOutput } from '../src/render';

describe('Render', () => {
  describe('getURLFromOutput', () => {
    it('should get the URL for an output file name', () => {
      const tests = [
        { file: '/index.html', url: '/' },
        { file: '/about/index.html', url: '/about/' },
        { file: '/blog/category/10/index.html', url: '/blog/category/10/' },
        { file: '/us/about.html', url: '/us/about.html' },
        { file: '/sitemap.xml', url: '/sitemap.xml' },
      ];

      tests.forEach(({ file, url }) => {
        expect(getURLFromOutput(file)).toBe(url);
      });
    });
  });

  describe('appendIndexHTML', () => {
    it(`should append "index.html" if needed`, () => {
      const tests = [
        { input: '', result: '/index.html' },
        { input: '/', result: '/index.html' },
        { input: '/lorem-ipsum', result: '/lorem-ipsum/index.html' },
        { input: '/lorem-ipsum/', result: '/lorem-ipsum/index.html' },
        { input: '/lorem-ipsum/index.html', result: '/lorem-ipsum/index.html' },
      ];

      tests.forEach(({ input, result }) => {
        expect(appendIndexHTML(input)).toBe(result);
      })
    });
  });
});
