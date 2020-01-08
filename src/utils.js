// @flow
// (Copyright) Confluent, Inc.
import type { $Request } from 'express';

export const rawLogger = {
  // eslint-disable-next-line no-console
  log: console.log,
  // eslint-disable-next-line no-console
  warn: console.warn,
  // eslint-disable-next-line no-console
  error: console.error,
};

export const logger = {
  log: (req: $Request, ...message: any[]) => {
    // eslint-disable-next-line no-console
    console.log(req.method, req.originalUrl, ...message);
  },
  error: (req: $Request, ...message: any[]) => {
    // eslint-disable-next-line no-console
    console.error('ERR', req.method, req.originalUrl, ...message);
  },
  warn: (req: $Request, ...message: any[]) => {
    // eslint-disable-next-line no-console
    console.warn(req.method, req.originalUrl, ...message);
  },
};

// http likely normalizes these already, but just as a precaution, we'll do it explicitly
export const normalizeReqHeaders = (req: $Request): void => {
  const headers = req.headers;
  const newHeaders = Object.keys(headers).reduce((accum: { [string]: any }, key) => {
    accum[key.toLowerCase()] = headers[key];
    return accum;
  }, {});
  req.headers = newHeaders;
};
