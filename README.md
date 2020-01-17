# Mox

A [node.js](https://nodejs.org/en/) developer tool written on top of [express.js](https://expressjs.com/). Mox is a cross between a mock and a proxy server.

## Why this exists

Mox's purpose is to bridge the gap between mock server usage and live backend usage. Frontend development processes typically fall into one of two camps:

- Build off of mock servers
- Build off of a local or hosted development backend

Mox is a tool that helps you use both at the same time. It also provides a few other APIs that make the second camp a lot easier.

Some key features:

- Read or modify requests/responses in-flight
- Mock individual endpoints or set of endpoints
- Express.js based routing and pattern matching

## Installation

Install this package through [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/lang/en/).

`npm install @confluentinc/mox`

## The basics

Here's a quick example of what it takes to configure the server, perform a simple mock, and get it running.

```javascript
import { MoxServer } from '@confluentinc/mox';

const server = new MoxServer({ targetUrl: 'https://dev.server', listenPort: 3005 });
const Mox = server.getRouter();

Mox.get('/api/route-to-mock').mock({ foo: 'bar' });

server.start();
```

Mox supports most common HTTP methods, including `HEAD`, `OPTIONS`, and `PATCH`. It also supports the `all` matcher from `express.js` which matches all methods.

In the above example, `router.get` matches the same way `app.get` would in `express`.

## Documentation

More detailed [API reference](docs/API.md)
