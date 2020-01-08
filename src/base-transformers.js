// @flow
// (Copyright) Confluent, Inc.
import type { $Request, $Response } from 'express';

export interface Transformer<Ctx> {
  +dontRequest?: boolean; // for mock and error
  +fullPassThrough?: boolean; // for chains that only redirect the request
  +modifyReq: (req: $Request, context: Ctx) => Promise<$Request>;
  +modifyRes: (body: any, context: Ctx) => Promise<*>;
  +triggerSend: boolean;
}

export type TransformerOptions = {|
  dontRequest?: boolean,
  fullPassThrough?: boolean,
  triggerSend?: boolean,
|};

export class BaseTransformer<Ctx> implements Transformer<Ctx> {
  +triggerSend: boolean;
  +dontRequest: boolean;
  +fullPassThrough: boolean;

  constructor(options: TransformerOptions) {
    const { triggerSend, dontRequest, fullPassThrough } = {
      triggerSend: false,
      dontRequest: false,
      fullPassThrough: false,
      ...options,
    };
    this.triggerSend = triggerSend;
    this.dontRequest = dontRequest;
    this.fullPassThrough = fullPassThrough;
  }
  // default pass through modifiers
  // eslint-disable-next-line no-unused-vars
  modifyReq(req: $Request, context: Ctx): Promise<$Request> {
    return new Promise(resolve => resolve(req));
  }

  // eslint-disable-next-line no-unused-vars
  modifyRes(body: any, context: Ctx): Promise<*> {
    return new Promise(resolve => resolve(body));
  }
}

export type ReqTransformType<Ctx> = (req: $Request, context: Ctx) => $Request | Promise<$Request>;
export class ReqTransformer<Ctx> extends BaseTransformer<Ctx> {
  modify: ReqTransformType<Ctx>;

  constructor(modify: ReqTransformType<Ctx>) {
    super({ triggerSend: false });
    this.modify = modify;
  }

  modifyReq(req: $Request, context: Ctx): Promise<$Request> {
    const reqOrPromise = this.modify(req, context);
    return new Promise(resolve => {
      Promise.resolve(reqOrPromise).then(resolve);
    });
  }
}

export type ResTransformType<Ctx> = (body: any, context: Ctx) => * | Promise<*>;
export class ResTransformer<Ctx> extends BaseTransformer<Ctx> {
  modify: ResTransformType<Ctx>;

  constructor(modify: ResTransformType<Ctx>, options: TransformerOptions = ({}: any)) {
    super({ ...options, triggerSend: true });
    this.modify = modify;
  }

  modifyRes(body: any, context: Ctx): Promise<$Response> {
    const resOrPromise = this.modify(body, context);
    return new Promise(resolve => {
      Promise.resolve(resOrPromise).then(resolve);
    });
  }
}
