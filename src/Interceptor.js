// @flow
// (Copyright) Confluent, Inc.

import type { $Request, $Response } from 'express';

import { logger, normalizeReqHeaders } from './utils';
import {
  Transformer as TransformerT,
  BaseTransformer as BaseTransformerT,
  ReqTransformer as ReqTransformerT,
  ResTransformer as ResTransformerT,
  type TransformerOptions,
  type ResTransformType as ResTransformTypeT,
  type ReqTransformType as ReqTransformTypeT,
} from './base-transformers';
import proxyRequest, { sendToClient } from './proxy-request';
import { defaultBodyHandler } from './DefaultBodyHandler';
import { type InterceptorOptions, type Handler, InterceptorI } from './types';

type Context = {
  pathTokens?: {
    [string]: string,
  },
  req: $Request,
  res: $Response,
  targetUrl: string,
  transformStack: Array<Transformer>,
  ...
};

type Transformer = TransformerT<Context>;
type ResTransformType = ResTransformTypeT<Context>;
type ReqTransformType = ReqTransformTypeT<Context>;

const BaseTransformer: Class<BaseTransformerT<Context>> = BaseTransformerT;
const ReqTransformer: Class<ReqTransformerT<Context>> = ReqTransformerT;
const ResTransformer: Class<ResTransformerT<Context>> = ResTransformerT;

export default class Interceptor implements InterceptorI {
  _transformers: Array<Transformer> = [];
  options: InterceptorOptions;

  constructor(options: InterceptorOptions) {
    this.options = options;
  }

  _addReqTransform(fn: ReqTransformType): void {
    this._transformers.push(new ReqTransformer(fn));
  }

  _addResTransform(fn: ResTransformType, options?: TransformerOptions): void {
    this._transformers.push(new ResTransformer(fn, options));
  }

  /*
   * Flex transforms
   * These transformations can operate on either the inbound or outbound side of the proxy request
   */

  delay(time: number): Interceptor {
    const delay = (passThrough: any) => {
      return new Promise(resolve => {
        setTimeout(() => resolve(passThrough), time);
      });
    };
    this._transformers.push({
      triggerSend: false,
      modifyReq: delay,
      modifyRes: delay,
    });
    return this;
  }

  log(opts: { hideHeaders: boolean } = {}): Interceptor {
    const { hideHeaders = false } = opts;
    this._transformers.push({
      triggerSend: false,
      modifyReq: (req: $Request) => {
        return new Promise(resolve => {
          logger.log(req, '\nREQUEST INFO:\n', {
            url: req.url,
            ...(hideHeaders ? {} : { headers: req.headers }),
            params: req.params,
            query: req.query,
          });
          resolve(req);
        });
      },
      modifyRes: (body, context: Context) => {
        return new Promise(resolve => {
          logger.log(context.req, '\nBODY:\n', body, '\nRESPONSE INFO:\n', {
            status: context.res.statusCode,
            // $FlowExpectError
            ...(hideHeaders ? {} : { headers: context.res.getHeaders() }),
          });
          resolve(body);
        });
      },
    });
    return this;
  }

  apply(
    fn: (arg: { mox: InterceptorI, req: $Request, res: $Response }) => void | Promise<void>
  ): Interceptor {
    const execute = async (passThrough: any, ctx: Context) => {
      const mox = new Interceptor(this.options);
      const { req, res } = ctx;
      await fn({ mox, req, res });
      ctx.transformStack.unshift(...mox._transformers);
      return passThrough;
    };
    this._transformers.push({
      triggerSend: false,
      modifyReq: execute,
      modifyRes: execute,
    });
    return this;
  }

  req(fn: (req: $Request) => void): Interceptor {
    this._addReqTransform(req => {
      fn(req);
      return req;
    });
    return this;
  }

  res(fn: (res: $Response) => void): Interceptor {
    this._addResTransform((body, ctx) => {
      fn(ctx.res);
      return body;
    });
    return this;
  }

  /*
   * Response transforms
   * These transformations can only operate on the response. Once the engine reaches a response transform,
   * all subsequent request transforms will no-op.
   */
  status(statusCode: number): Interceptor {
    this._addResTransform((body, context: Context) => {
      context.res.status(statusCode);
      return body;
    });
    return this;
  }

  mutate(mutator: (response: any) => any): Interceptor {
    this._addResTransform(body => mutator(body));
    return this;
  }

  mock(response: any, statusCode?: number): Interceptor {
    this._addResTransform(
      (body, context: Context) => {
        if (typeof statusCode === 'number') {
          context.res.status(statusCode);
        }
        return response;
      },
      { dontRequest: true }
    );
    return this;
  }

  /*
   * Request transforms
   * These transformations can only operate on the request. Primarily used to change the url of the request.
   */

  goto(path: string | ((from: string, req: $Request) => string)): Interceptor {
    this._addReqTransform((req: $Request) => {
      const toPath = typeof path === 'function' ? path(req.url, req) : path;
      req.url = toPath;
      return req;
    });
    return this;
  }

  setBase(targetUrl: string): Interceptor {
    this._addReqTransform((req: $Request, context: Context) => {
      context.targetUrl = targetUrl;
      return req;
    });
    return this;
  }

  send(): Interceptor {
    this._addResTransform(body => body);
    return this;
  }

  compile(): Handler {
    this._transformers.push(new BaseTransformer({ triggerSend: true, fullPassThrough: true })); // ensure query gets sent if only req modifiers exist

    const handler = (originalReq: $Request, res: $Response) => {
      let req = originalReq;
      let triggered = false;
      let body;
      const context = {
        req,
        res,
        targetUrl: this.options.targetUrl,
        transformStack: [...this._transformers],
      };
      const execute = async () => {
        await defaultBodyHandler.parseInitialRequestBody(context.req);
        normalizeReqHeaders(req);
        while (context.transformStack.length !== 0) {
          const transformer = context.transformStack.shift();
          if (transformer.triggerSend && triggered === false) {
            triggered = true;
            if (transformer.fullPassThrough === true) {
              logger.log(req, 'Pass-through to', req.url);
              this.options.proxy(req, res, context.targetUrl);
              return;
            } else if (transformer.dontRequest === true) {
              logger.log(req, 'No request sent');
              body = {};
            } else {
              body = await proxyRequest(context.targetUrl, req, res);
            }
          }
          if (triggered) {
            body = await transformer.modifyRes(body, context);
          } else {
            req = await transformer.modifyReq(req, context);
            context.req = req;
          }
        }
        sendToClient(body, res);
      };
      execute().catch(err => {
        logger.error(req, `An unexpected error occurred ${err}`);
      });
    };
    return handler;
  }
}
