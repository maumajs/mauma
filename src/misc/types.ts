export enum i18nStrategy {
  Prefix = 'prefix',
  PrefixExceptDefault = 'prefix_except_default',
}

export interface Config {
  i18n: {
    locales: string[];
    defaultLocale: string;
    strategy: i18nStrategy;
  };
}

export interface IPage {
  getData(params: Record<string, any>): Promise<Record<string, any>>;
  getRoutes(): Promise<any[]>;
  getPermalink(): Record<string, string>;
  render(data: Record<string, any>): Promise<string>;
}

export class Page implements IPage {
  public async getData(params: Record<string, any>): Promise<Record<string, any>> {
    return {};
  }

  public async getRoutes(): Promise<any[]> {
    return [];
  }

  public getPermalink(): Record<string, string> {
    return {}
  }

  public async render(data: Record<string, any>): Promise<string> {
    return '';
  }
}
