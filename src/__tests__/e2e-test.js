// @flow
// (Copyright) Confluent, Inc.

import { MoxServer } from '../MoxServer';
import { initTestServer } from '../__mocks__/mox-test-server';

import { getRequest, postRequest } from './mox-test-utils';

const TARGET_PORT = 3100;
const PROXY_PORT = 3050;
const TARGET_BASE = `http://localhost:${TARGET_PORT}`;
const PROXY_BASE = `http://localhost:${PROXY_PORT}`;

const utils = require('../utils');

// $FlowExpectError
utils.rawLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
// $FlowExpectError
utils.logger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const simpleRequest = (endpoint: string) => {
  return getRequest(PROXY_BASE, endpoint);
};

const jsonPostRequest = (endpoint: string, body: Object) => {
  return postRequest(PROXY_BASE, endpoint, body, 'application/json');
};

const textPostRequest = (endpoint: string, body: string) => {
  return postRequest(PROXY_BASE, endpoint, body, 'text/plain');
};

describe('Mox', () => {
  let endServer;
  let proxyServer;
  let Mox;

  const setup = async () => {
    // End Server
    endServer = await initTestServer(TARGET_PORT);
    // Proxy server
    const moxServer = new MoxServer({
      targetUrl: TARGET_BASE,
      listenPort: PROXY_PORT,
      proxyUnmatchedRoutes: false,
    });
    Mox = moxServer.getRouter();
    proxyServer = await moxServer.start();
  };

  const teardown = async () => {
    await new Promise(resolve => {
      endServer.close(resolve);
    });

    await new Promise(resolve => {
      proxyServer.close(resolve);
    });
  };

  beforeAll(setup);
  afterAll(teardown);

  // it's expensive to setup and teardown the mock servers each time, so instead we version the apis
  let ver = 1;
  beforeEach(() => {
    ver++;
  });

  describe('transformers', () => {
    test('goto', async () => {
      Mox.get('/this/leads/nowhere').goto(`/api/array`);
      const { body } = await simpleRequest('/this/leads/nowhere');
      expect(JSON.parse(body)).toEqual(['foo', 'bar', 'baz']);
    });

    describe('setBase', () => {
      let secondaryServer;
      const secondaryPort = TARGET_PORT + 1;
      const secondaryUrl = `http://localhost:${secondaryPort}`;
      beforeAll(async () => {
        secondaryServer = await initTestServer(secondaryPort, 'Second Server');
      });
      afterAll(async () => {
        await new Promise(resolve => {
          secondaryServer.close(resolve);
        });
      });
      it('changes the base url of a fullPassThrough request', async () => {
        Mox.get(`/${ver}/info`).setBase(secondaryUrl);
        const { body } = await simpleRequest(`/${ver}/info`);
        expect(JSON.parse(body)).toEqual({ port: secondaryPort, name: 'Second Server' });
      });
      it('changes the base url a chain that does not fully pass through', async () => {
        Mox.get(`/${ver}/info`)
          .setBase(secondaryUrl)
          .mutate(body => ({ ...body, test: 100 }));
        const { body } = await simpleRequest(`/${ver}/info`);
        expect(JSON.parse(body)).toEqual({ port: secondaryPort, name: 'Second Server', test: 100 });
      });
    });

    test('mutate', async () => {
      Mox.get(`/${ver}/object`).mutate((val, { req, res }) => ({
        ...val,
        extra: 'this is extra',
        hasReq: !!req,
        hasResp: !!res,
      }));
      const { body } = await simpleRequest(`/${ver}/object`);
      expect(JSON.parse(body)).toEqual({
        id: 'zxcv',
        name: 'Bob',
        location: 'Palo Alto, CA',
        extra: 'this is extra',
        hasReq: true,
        hasResp: true,
      });
    });

    test('transformers chain', async () => {
      Mox.get(`/${ver}/chains`)
        .mock({ num: 100 })
        .mutate(val => ({ num: val.num + 1 }));
      const { body } = await simpleRequest(`/${ver}/chains`);
      expect(JSON.parse(body)).toEqual({ num: 101 });
    });

    test('apply', async () => {
      Mox.get(`/${ver}/dead/end`)
        .goto(`/${ver}/array`)
        .apply(({ mox }) => {
          mox.mutate(val => [...val, 5]);
        });

      const { body } = await simpleRequest(`/${ver}/dead/end`);
      expect(JSON.parse(body)).toEqual(['foo', 'bar', 'baz', 5]);
    });

    test('modify req', async () => {
      Mox.get(`/${ver}/send-back-header/*`).req(req => {
        req.headers['x-mox-incoming-test'] = 'gotcha!';
      });
      const { body } = await simpleRequest(`/${ver}/send-back-header/foo`);
      expect(JSON.parse(body)).toEqual({ received: 'gotcha!' });
    });

    test('modify res', async () => {
      Mox.get(`/${ver}/send-back-header/*`).res(res => {
        res.setHeader('x-mox-outgoing-test', 'nailed it');
      });
      const { response } = await simpleRequest(`/${ver}/send-back-header/foo`);
      expect(response.headers['x-mox-outgoing-test']).toBe('nailed it');
    });
  });

  describe('content-type / body handling', () => {
    describe('ability to parse bodies', () => {
      let url;
      let examine;
      beforeEach(() => {
        url = `/${ver}/dead-end`;
        examine = jest.fn();
        Mox.post(url).apply(({ mox, req }) => {
          examine(req.body);
          mox.mock(null);
        });
      });

      test('can parse application/json request body', async () => {
        const postBody = { foo: 'bar' };
        await jsonPostRequest(url, postBody);
        expect(examine).toBeCalledWith({ foo: 'bar' });
      });

      test('can parse text/plain request body', async () => {
        const postBody = JSON.stringify({ foo: 'bar' });
        await textPostRequest(url, postBody);
        expect(examine).toBeCalledWith(`{"foo":"bar"}`);
      });

      test('can parse array', async () => {
        const postBody = [1, 2, 3];
        await jsonPostRequest(url, postBody);
        expect(examine).toHaveBeenCalledWith([1, 2, 3]);
      });

      test('can parse empty array', async () => {
        const postBody = [];
        await jsonPostRequest(url, postBody);
        expect(examine).toHaveBeenCalledWith([]);
      });

      test('can parse empty object', async () => {
        const postBody = {};
        await jsonPostRequest(url, postBody);
        expect(examine).toHaveBeenCalledWith({});
      });
    });

    describe('intercepted proxy behavior', () => {
      test('can re-serialize application/json request body (e2e)', async () => {
        const postBody = { foo: 'bar' };
        const url = `/${ver}/send-back-json-body`;
        Mox.post(url).mutate(resp => resp);

        const { body } = await jsonPostRequest(url, postBody);
        expect(body).toEqual({
          message: 'ok',
          received: {
            foo: 'bar',
          },
        });
      });

      test('can re-serialize application/json request body (server can parse)', async () => {
        const postBody = { foo: 'bar' };
        const url = `/${ver}/send-back-foo`;
        Mox.post(url).mutate(resp => resp);

        const { body } = await jsonPostRequest(url, postBody);
        expect(body).toEqual({
          'this-is-foo': 'bar',
        });
      });

      test('can re-serialize text/plain request body (e2e)', async () => {
        const postBody = JSON.stringify({ foo: 'bar' });
        const url = `/${ver}/send-back-text-body`;
        Mox.post(url).mutate(resp => resp);

        const { body } = await textPostRequest(url, postBody);
        expect(body).toEqual(`received: {"foo":"bar"}`);
      });

      test('can re-serialize text/plain request body (server can parse)', async () => {
        const postBody = JSON.stringify({ foo: 'bar' });
        const url = `/${ver}/first-5-chars`;
        Mox.post(url).mutate(resp => resp);

        const { body } = await textPostRequest(url, postBody);
        expect(body).toEqual(`{"foo`);
      });

      test('does not parse text/plain into json', async () => {
        const url = `/${ver}/text-plain-looks-like-json`;
        const examine = jest.fn();
        Mox.get(url).mutate(resp => examine(resp));

        await simpleRequest(url);
        expect(examine).toHaveBeenCalledWith(expect.any(String));
      });
    });

    describe('pass-through proxy behavior', () => {
      // make sure mox properly reads the request body and re-streams it for json body
      test('can re-stream application/json request body', async () => {
        const postBody = { foo: 'bar' };
        const url = `/${ver}/send-back-json-body`;
        Mox.post(url);

        const { body } = await jsonPostRequest(url, postBody);
        expect(body).toEqual({
          message: 'ok',
          received: {
            foo: 'bar',
          },
        });
      });

      // make sure mox properly reads the request body and re-streams it for text body
      test('can re-stream text/plain request body', async () => {
        const postBody = JSON.stringify({ foo: 'bar' });
        const url = `/${ver}/send-back-text-body`;
        Mox.post(url);

        const { body } = await textPostRequest(url, postBody);
        expect(body).toEqual(`received: {"foo":"bar"}`);
      });

      test('can change and re-stream the request body', async () => {
        const postBody = { foo: 'bar' };
        const url = `/${ver}/send-back-json-body`;

        Mox.post(url).apply(({ req }) => {
          req.body = {
            ...req.body,
            extra: 'property',
          };
        });

        const { body } = await jsonPostRequest(url, postBody);
        expect(body).toEqual({
          message: 'ok',
          received: {
            foo: 'bar',
            extra: 'property',
          },
        });
      });

      test('can re-stream empty array', async () => {
        const postBody = [];
        const url = `/${ver}/send-back-json-body`;

        Mox.post(url);

        const { body } = await jsonPostRequest(url, postBody);
        expect(body).toEqual({
          message: 'ok',
          received: [],
        });
      });

      test('can change and re-stream array', async () => {
        const postBody = [1, 2, 3];
        const url = `/${ver}/send-back-json-body`;

        Mox.post(url).apply(({ req }) => {
          req.body = [...(req.body: any), 'imposter'];
        });

        const { body } = await jsonPostRequest(url, postBody);
        expect(body).toEqual({
          message: 'ok',
          received: [1, 2, 3, 'imposter'],
        });
      });
    });
  });
});
