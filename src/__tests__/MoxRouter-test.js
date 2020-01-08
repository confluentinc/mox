// @flow
// (Copyright) Confluent, Inc.
import express from 'express';

import { MoxRouter } from '../MoxRouter';

describe('MoxRouter', () => {
  let app;
  let options;
  beforeEach(() => {
    app = express();
    options = { app, targetUrl: 'localhost:3100', proxy: jest.fn() };
  });
  it('creates an object of functions', () => {
    const Mox = new MoxRouter(options);
    expect(Mox).toMatchObject({
      get: expect.any(Function),
      put: expect.any(Function),
      all: expect.any(Function),
      post: expect.any(Function),
      delete: expect.any(Function),
    });
  });
});
