import globby from 'globby';
import { join } from 'path';
import { build } from 'vite';
import { minifyHtml } from 'vite-plugin-html';

const clientDir = join(process.cwd(), 'src/client');
const publicDir = join(process.cwd(), 'src/public');
const scssDir = join(process.cwd(), 'src/scss');
const prebuildDir = join(process.cwd(), '.mauma/build');
const buildDir = join(process.cwd(), 'build');

(async () => {
  const files = await globby([join(prebuildDir, '**/*.html')]);

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
        input: files,
      }
    },
    plugins: [
      minifyHtml(),
    ],
  });
})();
