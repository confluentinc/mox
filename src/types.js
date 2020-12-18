// @flow
// (Copyright) Confluent, Inc.
/* eslint-disable flowtype/sort-keys */

import http from 'http';
import https from 'https';
import stream from 'stream';

import request from 'request';
import type { $Application, $Request, $Response, NextFunction } from 'express';

export type ActionsOptions = {
  app: $Application<>,
  proxy: ProxyHandler,
  targetUrl: string,
};

export interface ActionsI {
  // flex transforms
  apply(
    fn: (arg: { mox: ActionsI, req: $Request, res: $Response }) => void | Promise<void>
  ): ActionsI;
  delay(time: number): ActionsI;
  log(opts?: { hideHeaders: boolean }): ActionsI;

  // req transforms
  req(fn: (req: $Request) => void): ActionsI;
  goto(path: string | ((from: string, req: $Request) => string)): ActionsI;
  setBase(targetUrl: string): ActionsI;
  send(): ActionsI;

  // res transforms
  res(fn: (res: $Response) => void): ActionsI;
  status(statusCode: number): ActionsI;
  mutate(mutator: (response: any, context: { req: $Request, res: $Response }) => any): ActionsI;
  mock(response: any, statusCode?: number): ActionsI;
}

export type MoxRouterMethod = (path: string) => ActionsI;

export interface MoxRouterI {
  constructor(options: ActionsOptions): void;

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
  parseInterceptedResponseBody(body: any, response: typeof request.Response): Awaitable<?any>;
}
