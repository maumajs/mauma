import { Route } from './route';
import { RouteInstance } from './route-instance';
import { makeIterator } from './utils';

export class RouteCollection implements Iterable<Route> {
  constructor(
    protected routes: Route[],
  ) {
    routes.forEach(route => route['setRoutes'](this));
  }

  public [Symbol.iterator](): Iterator<Route, any, undefined> {
    return makeIterator(this.routes);
  }

  public getAll(): Route[] {
    return this.routes;
  }

  public get(name: string): Route | undefined {
    return this.routes.find(route => name === route.name);
  }

  public getInstances(): RouteInstance[] {
    return this.routes.flatMap(route => route.getInstances());
  }
}
