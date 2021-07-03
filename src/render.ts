import { getRouteURL } from './routes';
import { MaumaI18NStrategy } from './public/types';
import { GetOutputFileFn } from './route';

export function getURLFromOutput(file: string): string {
  return file.replace('index.html', '');
}

export function appendIndexHTML(path: string): string {
  if (/\/index\.html$/.test(path.toLowerCase())) {
    return path;
  } else {
    path = path.replace(/\/+$/, '');
    return `${path}/index.html`;
  }
}

export const getOutputFile: GetOutputFileFn = async ({ config, task }) => {
  let output = appendIndexHTML(getRouteURL(task.route.file));

  if (task.config.i18nEnabled && !task.instance.locale) {
    throw new Error(`Route instance is missing locale, disableI18N() for this route or set the locale on getRouteInstances().`);
  }

  if (task.config.getI18NPermalinks) {
    const i18nPermalinks = await task.config.getI18NPermalinks();

    if (task.instance.locale && task.instance.locale in i18nPermalinks) {
      output = appendIndexHTML(i18nPermalinks[task.instance.locale]);
    }
  }

  // Prefix locale for i18n routes
  if (task.config.i18nEnabled) {
    if (config.i18n.strategy === MaumaI18NStrategy.Prefix || task.instance.locale !== config.i18n.defaultLocale) {
      output = `/${task.instance.locale}${output}`;
    }
  }

  // Replace params
  Object.entries(task.instance.params).forEach(([param, value]) => {
    output = output.replace(`[${param}]`, value as string);
  });

  return output;
};
