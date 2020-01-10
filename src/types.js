// @flow
// (Copyright) Confluent, Inc.
/* eslint-disable flowtype/sort-keys */

import http from 'http';
import https from 'https';
import stream from 'stream';

import request from 'request';
import type { $Application, $Request, $Response, NextFunction } from 'express';

export type InterceptorOptions = {
  app: $Application<>,
  proxy: ProxyHandler,
  targetUrl: string,
};

export interface InterceptorI {
  // flex transforms
  apply(
    fn: (arg: { mox: InterceptorI, req: $Request, res: $Response }) => void | Promise<void>
  ): InterceptorI;
  delay(time: number): InterceptorI;
  log(opts?: { hideHeaders: boolean }): InterceptorI;

  // req transforms
  req(fn: (req: $Request) => void): InterceptorI;
  goto(path: string | ((from: string, req: $Request) => string)): InterceptorI;
  setBase(targetUrl: string): InterceptorI;
  send(): InterceptorI;

  // res transforms
  res(fn: (res: $Response) => void): InterceptorI;
  status(statusCode: number): InterceptorI;
  mutate(mutator: (response: any) => any): InterceptorI;
  mock(response: any, statusCode?: number): InterceptorI;
}

type MoxRouterMethod = (path: string) => InterceptorI;

export interface MoxRouterI {
  constructor(options: InterceptorOptions): void;

  all: MoxRouterMethod;
  delete: MoxRouterMethod;
  get: MoxRouterMethod;
  head: MoxRouterMethod;
  options: MoxRouterMethod;
  patch: MoxRouterMethod;
  post: MoxRouterMethod;
  put: MoxRouterMethod;
}

export type MoxServerCfg = {
  app?: $Application<>,
  disableEtag?: boolean,
  listenPort?: number,
  proxyUnmatchedRoutes?: boolean,
  targetUrl?: string,
};

export type Initializer = (Mox: MoxRouterI) => void;

export interface MoxServerI {
  constructor(cfg: MoxServerCfg): void;

  app: $Application<>;
  disableEtag: boolean;
  listenPort: number;
  proxyUnmatchedRoutes: boolean;
  targetUrl: string;

  // methods
  getRouter(): MoxRouterI;
  start(initialize?: Initializer): Promise<http.Server | https.Server>;
}

export type Handler = (req: $Request, res: $Response, next: NextFunction) => any;
export type ProxyHandler = (req: $Request, res: $Response, target?: string) => any;

type Awaitable<T> = Promise<T> | T;

export interface BodyHandler {
  parseInitialRequestBody(req: $Request): Awaitable<void>;
  restreamInitialRequestBody(req: $Request): Awaitable<?stream.Readable>;
  serializeRequestBody(req: $Request): Awaitable<?string>;
  parseInterceptedResponseBody(body: any, response: request.Response): Awaitable<?any>;
}
