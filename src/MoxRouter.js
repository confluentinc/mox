// @flow
// (Copyright) Confluent, Inc.
import type { $Request, $Response } from 'express';
import { once } from 'lodash';

import Interceptor from './Interceptor';
import { MoxRouterI, type InterceptorOptions, type Handler } from './types';

export class MoxRouter implements MoxRouterI {
  _options: InterceptorOptions;

  _applyMox(path: string, expressMethod: (path: string, handler: Handler) => any) {
    const interceptor = new Interceptor(this._options);
    const compileOnce = once(() => interceptor.compile());
    expressMethod.call(this._options.app, path, (req: $Request, res: $Response, next) => {
      const handler = compileOnce();
      handler(req, res, next);
    });

    return interceptor;
  }

  all = (path: string) => {
    return this._applyMox(path, this._options.app.all);
  };

  get = (path: string) => {
    return this._applyMox(path, this._options.app.get);
  };

  put = (path: string) => {
    return this._applyMox(path, this._options.app.put);
  };

  post = (path: string) => {
    return this._applyMox(path, this._options.app.post);
  };

  delete = (path: string) => {
    return this._applyMox(path, this._options.app.delete);
  };

  patch = (path: string) => {
    return this._applyMox(path, this._options.app.patch);
  };

  head = (path: string) => {
    return this._applyMox(path, this._options.app.head);
  };

  options = (path: string) => {
    return this._applyMox(path, this._options.app.options);
  };

  constructor(options: InterceptorOptions) {
    this._options = options;
  }
}
