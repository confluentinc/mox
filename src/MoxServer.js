// @flow
// (Copyright) Confluent, Inc.

import http from 'http';
import https from 'https';
import url from 'url';

import pem from 'pem';
import express from 'express';
import type { $Application, $Request, $Response } from 'express';
import httpProxy from 'http-proxy';

import { MoxRouter } from './MoxRouter';
import { rawLogger } from './utils';
import { type MoxServerCfg, type Initializer, MoxServerI } from './types';
import { defaultBodyHandler } from './DefaultBodyHandler';

export class MoxServer implements MoxServerI {
  app: $Application<>;
  targetUrl: string;
  listenPort: number;
  proxyUnmatchedRoutes: boolean;
  disableEtag: boolean;

  _moxRouter: MoxRouter;
  _apiProxy: httpProxy;

  constructor(cfg: MoxServerCfg = {}) {
    this.app = cfg.app ?? express();
    this.targetUrl = cfg.targetUrl ?? 'http://localhost:3000';
    this.listenPort = cfg.listenPort ?? 3005;
    this.proxyUnmatchedRoutes = cfg.proxyUnmatchedRoutes ?? true;
    this.disableEtag = cfg.disableEtag ?? true;

    this._apiProxy = httpProxy.createProxyServer({
      rejectUnauthorized: false,
      secure: false,
      changeOrigin: true,
      target: this.targetUrl,
    });

    const passToProxy = async (req, res, target = this.targetUrl) => {
      const buffer = await defaultBodyHandler.restreamInitialRequestBody(req);
      if (buffer != null) {
        this._apiProxy.web(req, res, { target, buffer });
      } else {
        this._apiProxy.web(req, res, { target });
      }
    };

    this._moxRouter = new MoxRouter({
      app: this.app,
      targetUrl: this.targetUrl,
      proxy: passToProxy,
    });
  }

  getRouter(): MoxRouter {
    return this._moxRouter;
  }

  async start(initialize?: Initializer) {
    if (typeof initialize === 'function') {
      initialize(this.getRouter());
    }

    this._apiProxy.on('error', err => {
      rawLogger.error('An error occurred in http proxy', err);
    });

    if (this.proxyUnmatchedRoutes === true) {
      this.app.all('/*', (req: $Request, res: $Response) => {
        this._apiProxy.web(req, res, { target: this.targetUrl });
      });
    }

    if (this.disableEtag === true) {
      this.app.disable('etag'); // prevent 304 not modified on proxy through
    }

    const parsedUrl = url.parse(this.targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';

    let server;
    if (isHttps) {
      const keys = await new Promise((resolve, reject) =>
        pem.createCertificate({ days: 30, selfSigned: true }, (err, keys) => {
          if (err) {
            reject(err);
          }
          resolve(keys);
        })
      );

      server = https.createServer(
        {
          key: keys.serviceKey,
          cert: keys.certificate,
        },
        (this.app: any)
      );
    } else {
      server = http.createServer(this.app);
    }

    server.on('upgrade', (req, socket, head) => {
      this._apiProxy.ws(req, socket, head, { target: this.targetUrl });
    });

    await new Promise((resolve, reject) => {
      server.listen(this.listenPort, e => {
        if (e != null) {
          return reject(e);
        }
        rawLogger.log(
          `Server is listening at ${isHttps ? 'https' : 'http'}://0.0.0.0:${this.listenPort}`
        );
        return resolve();
      });
    });

    return server;
  }
}
