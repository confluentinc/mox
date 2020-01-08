// @flow
// (Copyright) Confluent, Inc.

import http from 'http';

import type { $Application, $Request, $Response } from 'express';
import express from 'express';
import bodyParser from 'body-parser';

export const initTestServer = (port: number = 3100, name: string = 'default_server') => {
  return new Promise<http.Server>(resolve => {
    const app: $Application<> = express();

    app.get('/*/array', (req: $Request, res: $Response) => {
      res.send(['foo', 'bar', 'baz']);
    });

    app.get('/*/object', (req: $Request, res: $Response) => {
      res.send({
        id: 'zxcv',
        name: 'Bob',
        location: 'Palo Alto, CA',
      });
    });

    app.get('/*/country/*/state/*/info', (req: $Request, res: $Response) => {
      const [, country, state] =
        req.originalUrl.match(/country\/([^/]+)\/state\/([^/]+)\/info/) ?? [];

      res.send({
        country,
        state,
      });
    });

    app.get('/*/info', (req: $Request, res: $Response) => {
      res.send({ name, port });
    });

    app.get('/*/send-back-header/:value', (req: $Request, res: $Response) => {
      const incHeader = req.header('x-mox-incoming-test');
      res.setHeader('x-mox-outgoing-test', req.params.value);
      res.send({ received: incHeader ?? null });
    });

    app.get('/*/text-plain-looks-like-json', (req: $Request, res: $Response) => {
      res.type('text/plain').send(JSON.stringify({ message: 'looks like json' }));
    });

    app.post('/*/send-back-foo', async (req: $Request, res: $Response) => {
      const contentType = req.get('content-type');
      if (contentType !== 'application/json') {
        res.status(400);
        res.send('Incorrect content type');
      } else {
        await new Promise(resolve => bodyParser.json()(req, null, resolve));
        res.type('application/json');
        res.send({ 'this-is-foo': (req.body: any).foo });
      }
    });

    app.post('/*/first-5-chars', async (req: $Request, res: $Response) => {
      const contentType = req.get('content-type');
      if (contentType !== 'text/plain') {
        res.status(400);
        res.send('Incorrect content type');
      } else {
        await new Promise(resolve => bodyParser.text()(req, null, resolve));
        res.type('text/plain');
        res.send((req.body: any).substring(0, 5));
      }
    });

    app.post('/*/send-back-json-body', async (req: $Request, res: $Response) => {
      const contentType = req.get('content-type');
      if (contentType !== 'application/json') {
        res.status(400);
        res.send('Incorrect content type');
      } else {
        await new Promise(resolve => bodyParser.json()(req, null, resolve));
        res.type('application/json');
        res.send({ message: 'ok', received: req.body });
      }
    });

    app.post('/*/send-back-text-body', async (req: $Request, res: $Response) => {
      const contentType = req.get('content-type');
      if (contentType !== 'text/plain') {
        res.status(400);
        res.send('Incorrect content type');
      } else {
        await new Promise(resolve => bodyParser.text()(req, null, resolve));
        res.type('text/plain');
        res.send(`received: ${String(req.body)}`);
      }
    });

    const server = http.createServer(app);
    server.listen(port, () => resolve(server));
  });
};
