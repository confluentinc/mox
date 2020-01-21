# API Reference

Mox has a few parts. The server and router are pretty standard.

- [MoxServer](#MoxServer)
- [MoxRouter](#MoxRouter)
- [Actions](#Actions)

---

## MoxServer

`MoxServer` is the entry point for Mox.

```js
import { MoxServer } from '@confluentinc/mox';
```

### Constructor

```js
new MoxServer(options);
```

#### Constructor options

- #### `listenPort` : `number` [recommended]

  The port that `MoxServer` will listen on. Defaults to `3005`.

- #### `targetUrl` : `string` [recommended]

  The url that `MoxServer` will proxy to by default. Defaults to `"http://localhost:3000"`. If this URL uses an `https` protocol, then `MoxServer` will also listen on `https`.

- #### `proxyUnmatchedRoutes` : `boolean` [optional]

  This flag determines if `MoxServer` will proxy to the `targetUrl` for incoming requests that do not match any pattern. For example, if the following routing rules are set:

  ```js
  MoxRouter.get('/api/route-to-mock').mutate(resp => resp);
  ```

  - An incoming request to `/api/route-to-mock` will be proxied to `<targetUrl>/api/route-to-mock` and intercepted.

  - An incoming request to `/api/other-route` will be dropped if `proxyUnmatchedRoutes` is false and will be proxied without modification is `proxyUnmatchedRoutes` is true.

  This flag defaults to `true`.

- #### `app` : `express $Application` [optional]

  This configuration allows an existing express app to be used. `MoxRouter` will apply route rules on top of that app. By default `MoxServer` will create a fresh express app.

- #### `disableEtag` : `boolean` [optional]

  This flag determines whether or not to disable `etag` on the express app. Defaults to `true`.

### Methods

- #### `.getRouter()` => `MoxRouter`

  This returns a reference to a `MoxRouter`, which handles the routing rules and proxy/mock logic.

- #### `.start()` => `Promise<Server>`

  Starts the Mox server, listening on the configured `listenPort`. Returns a promise that resolves with either an `http.Server` or an `https.Server`.

### Note

If `proxyUnmatchedRoutes` is `true`, then any routing rules applied to the `MoxRouter` after `.start()` is called will do nothing.

---

## MoxRouter

`MoxRouter` is the express-like object that handles routing and proxy/mock behavior. The following methods are supported:

`all` | `get` | `put` | `post` | `delete` | `head` | `patch` | `options`

The interface for each of these methods is the same.

`.get(url: string) => <Actions API>`

The param `url` should match the API route(s) that subsequent `actions` will modify. See [express routing](https://expressjs.com/en/guide/routing.html) for more details on routing rules.

---

## Actions

Actions API objects (`Actions` for short) are returned by method calls from `MoxRouter`. They can be chained with different actions.

```javascript
MoxRouter.get('/api/url/1')
  .delay(1000)
  .goto('/api/url/2');

// `delay` and `goto` are actions
```

Actions can affect the response or the request leg of a proxied request. Some can affect both. As a rule, actions that affect the request **must** come before actions that affect the response, otherwise those actions will do nothing.

### Request Actions

In a chain of actions, these actions should be called before response actions.

- #### `.goto(string | Function)` => `Actions`

  This action redirects incoming requests. If a string is provided, the request will be redirected to the given URL. Example:

  ```javascript
  MoxRouter.get('/api/route/:id').goto('/api/route/2');
  ```

  If a function is provided, it should have the signature `(from: string, req: $Request) => string`. Example:

  ```javascript
  MoxRouter.get('/api/route/:someId').goto((from, req) => {
    return `/api/route/${req.params.someId + 1}`; // express populates `params` with url parameters
  });
  ```

- #### `.setBase(string)` => `Actions`

  This action is like `goto` but instead sets base url. Instead of specifying the endpoint like `/api/route`, this action can redirect to different domains. Example:

  ```javascript
  MoxRouter.get('/api/route/*').setBase('https://dev.server2');
  ```

- #### `.send()` => `Actions`

  This does not do anything, but it triggers the request, meaning any further actions will affect the response leg of the network request. This is only useful if you want a generic action to apply specifically to the response leg. This method is not necessary to use other actions!

### Response Actions

- #### `.status(statusCode: number)` => `Actions`

  This action sets the status code of the response.

- #### `.mock(value, [statusCode: number])` => `Actions`

  This is a simple action that sets the response body and optionally sets the status code for the response. Example:

  ```javascript
  MoxRouter.get('/api/object').mock({ foo: 7 });
  ```

- #### `.mutate(fn: Function)` => `Actions`

  This action allows programmatic modification of the response payload. `fn` has the signature `(response: any) => any`. Example:

  ```javascript
  MoxRouter.get('/api/object').mutate(obj => {
    return {
      ...obj,
      foo: obj.foo + 100,
    }
  })
  ```

### Generic Actions

- #### `.delay(time: number)` => `Actions`

  Delay the request or response by the specified duration in milliseconds.

- #### `.log([options])` => `Actions`

  This action prints out debugging information for each request coming into the matched route. If the action is applied during the response leg of the proxied network request, response information will be printed instead. `options` is an object that currently supports 1 config:

  - `hideHeaders` : `boolean` [optional]

    This hides the headers of the request or response. Defaults to `false`.

- #### `.apply(fn: Function)` => `Actions`

  This is a powerful action that allows dynamically applied actions during the handling of a request/response. This is useful for conditionally applying actions.

  `fn` has the signature `({ mox: Actions, req: $Request, res: $Response }) => void | Promise<void>`

   Any actions called on `mox` will be only applied for the current request/response, and will be applied immediately after the current `.apply` call.

  Example:

  ```javascript
  MoxRouter.get('/api/*').apply(( { mox, req }) => {
    if (req.url.contains('bar')) {
      mox.goto('/api/baz');
    }
  }).mutate(resp => [...resp, 'foo']);
  ```

  In the above example, each request that matches `/api/*` will be conditionally redirected to `/api/baz` and then mutated.

  If `fn` returns a promise, `Actions` will wait for the promise before continuing with the request/response.

  Note: `req.body` allows you to access the request body, if it exists.

- #### `.req(fn: Function)` => `Actions`

  `fn` has the signature `(req: $Request) => void`. This action allows arbitrary manipulation of the `express` `req` object. This is equivalent to calling `.apply` and only using the `req` object.

- #### `.res(fn: Function)` => `Actions`

  Similar to the `.res` action, but applied to the response. `fn` has the signature `(res: $Request) => void`.
