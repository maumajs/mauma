import globby from 'globby';
import { copyFile } from 'fs/promises';
import { join } from 'path';
import { build } from 'vite';
import { minifyHtml } from 'vite-plugin-html';

const clientDir = join(process.cwd(), 'src/client');
const publicDir = join(process.cwd(), 'src/public');
const scssDir = join(process.cwd(), 'src/scss');
const prebuildDir = join(process.cwd(), '.mauma/build');
const buildDir = join(process.cwd(), 'build');

(async () => {
  const files = await globby([join(prebuildDir, '**/*')]);
  const filesOther: string[] = [];
  const filesHTML: string[] = [];

  // Separate HTML & non-HTML files
  files.forEach(file => {
    if (/\.html$/.test(file.toLowerCase())) {
      filesHTML.push(file);
    } else {
      filesOther.push(file);
    }
  });

  // Process HTML files /w Vite
  await build({
    root: prebuildDir,
    publicDir: publicDir,
    logLevel: 'warn',
    resolve: {
      alias: [
        {
          find: '@client',
          replacement: clientDir,
        },
        {
          find: '@scss',
          replacement: scssDir,
        },
      ]
    },
    build: {
      target: 'es2015',
      outDir: buildDir,
      emptyOutDir: true,
      rollupOptions: {
        input: filesHTML,
      }
    },
    plugins: [
      minifyHtml(),
    ],
  });

  // Copy non-HTML files
  await Promise.all(filesOther.map(file => {
    const destFile = join(buildDir, file.replace(prebuildDir, ''));
    return copyFile(file, destFile);
  }));
})();
