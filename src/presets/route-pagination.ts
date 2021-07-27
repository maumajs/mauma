import { Route, RouteBuilder } from '../route/route-builder';
import { RouteInstance } from '../route/route-instance';
import { GetPermalinkFn, RouteBuilderConfig, RouteInstanceConfig } from '../route/types';

interface RoutePaginationParams {
  route: string;
}

interface RoutePaginationFilterParams<Data = any> {
  param: string;
  values: () => Promise<string[]>;
  filter: (instance: RouteInstance<Data>, value: string) => boolean;
}

interface PaginationData {
  instances: RouteInstance[];
  pageIdx: number;
  page: number;
  pages: number;
  hasPrev: boolean;
  prevURL: string;
  hasNext: boolean;
  nextURL: string;
}

function paginate<T>(array: T[], page_size: number, page_number: number): T[] {
  return array.slice(page_number * page_size, (page_number + 1) * page_size);
}

export class RoutePaginationBuilder<Data = any> {
  private pageSize = 10;
  private routeToPaginate: string;
  private route: RouteBuilder<PaginationData>;
  private filterParams?: RoutePaginationFilterParams<Data>;

  constructor(params: RoutePaginationParams) {
    this.route = Route<PaginationData>();
    this.routeToPaginate = params.route;
  }

  private getConfig(): RouteBuilderConfig {
    this.route
      .setPriority(900)
      .setParamDefaults({ page: '1' })
      .getInstances(async ({ config, routes, route: paginationRoute }) => {
        const route = routes.get(this.routeToPaginate);
        const out: RouteInstanceConfig<PaginationData>[] = [];
        const pageKey = (idx: number, filter?: string) => filter ? `${idx.toString()}-${filter}` : idx.toString();

        if (route) {
          const instances = route.getInstances();
          const locales: (string | undefined)[] = route.i18nEnabled ? config.i18n.locales.map(l => l.code) : [undefined];
          const filters: (string | undefined)[] = this.filterParams ? await this.filterParams.values() : [undefined];

          for (const locale of locales) {
            // Filter by locale
            const hasLocale = typeof locale === 'string';
            const localeInstances = instances.filter(i => hasLocale ? i.locale === locale : true);

            for (const filter of filters) {
              // Filter by user provided "filter"
              const hasFilter = typeof filter === 'string';
              const filteredInstances = localeInstances.filter(i => hasFilter ? this.filterParams!.filter(i, filter!) : true);
              const filterParam = hasFilter ? { [this.filterParams!.param]: filter } : {};

              // Paginate results
              const pages = Math.ceil(filteredInstances.length / this.pageSize);

              for (let pageIdx = 0; pageIdx < pages; pageIdx++) {
                const page = pageIdx + 1;
                const pageInstances = paginate(filteredInstances, this.pageSize, pageIdx);

                const hasPrev = pageIdx > 0;
                const prevIdx = page - 1;
                const prevInstance = { key: pageKey(prevIdx, filter), locale: locale, params: { page: prevIdx.toString(), ...filterParam } };
                const prevURL = hasPrev ? paginationRoute.getPermalink(prevInstance) : '';

                const hasNext = pageIdx < pages - 1;
                const nextIdx = page + 1;
                const nextInstance = { key: pageKey(nextIdx, filter), locale: locale, params: { page: nextIdx.toString(), ...filterParam } };
                const nextURL = hasNext ? paginationRoute.getPermalink(nextInstance) : '';

                out.push({
                  key: pageKey(pageIdx, filter),
                  locale: locale,
                  params: { page: page.toString(), ...filterParam },
                  data: {
                    instances: pageInstances,
                    hasPrev,
                    prevURL,
                    hasNext,
                    nextURL,
                    pageIdx,
                    pages,
                    page,
                  },
                });
              }
            }
          }
        }

        return out;
      });

    return this.route['getConfig']();
  }

  // public disableI18n(): RoutePaginationBuilder<Data> {
  //   this.route.disableI18n();
  //   return this;
  // }

  public setFilter(params: RoutePaginationFilterParams<Data>): RoutePaginationBuilder<Data> {
    this.filterParams = params;
    return this;
  }

  public setName(name: string): RoutePaginationBuilder<Data> {
    this.route.setName(name);
    return this;
  }

  public setPageSize(pageSize: number): RoutePaginationBuilder<Data> {
    this.pageSize = pageSize;
    return this;
  }

  public getPermalink(fn: GetPermalinkFn): RoutePaginationBuilder<Data> {
    this.route.getPermalink(fn);
    return this;
  }
}

export function RoutePagination<Data = any>(params: RoutePaginationParams): RoutePaginationBuilder<Data> {
  return new RoutePaginationBuilder<Data>(params);
}
