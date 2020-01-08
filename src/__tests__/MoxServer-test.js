// @flow
// (Copyright) Confluent, Inc.

import { MoxServer } from '../MoxServer';
import { MoxRouter } from '../MoxRouter';

describe('MoxServer', () => {
  test('getRouter returns a router', () => {
    const moxServer = new MoxServer({
      listenPort: 3000,
      targetUrl: 'http://localhost:3100',
    });

    expect(moxServer.getRouter()).toBeInstanceOf(MoxRouter);
  });
});
