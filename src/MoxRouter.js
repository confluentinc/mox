// @flow
// (Copyright) Confluent, Inc.
import type { $Request, $Response } from 'express';
import { once } from 'lodash';

import Actions from './Actions';
import { MoxRouterI, type ActionsOptions, type Handler } from './types';

export class MoxRouter implements MoxRouterI {
  _options: ActionsOptions;

  _applyMox(path: string, expressMethod: (path: string, handler: Handler) => any) {
    const actions = new Actions(this._options);
    const compileOnce = once(() => actions.compile());
    expressMethod.call(this._options.app, path, (req: $Request, res: $Response, next) => {
      const handler = compileOnce();
      handler(req, res, next);
    });

    return actions;
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

  constructor(options: ActionsOptions) {
    this._options = options;
  }
}
