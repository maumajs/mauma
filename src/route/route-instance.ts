import { RouteParams } from './types';

export class RouteInstance<Data = any> {
  constructor(
    public readonly key: string,
    public readonly locale: string | undefined,
    public readonly params: RouteParams,
    public readonly data: Data,
    public readonly permalink: string,
    public readonly output: string,
  ) { }
}
