// @flow
// (Copyright) Confluent, Inc.
import type { $Request } from 'express';
import bodyParser from 'body-parser';
import streamify from 'stream-array';
import request from 'request';

import { logger } from './utils';
import { type BodyHandler } from './types';

const validRequestBody = (req: $Request) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return (
      req.body != null &&
      typeof req.body === 'object' &&
      (Array.isArray(req.body) || Object.keys(req.body).length > 0)
    );
  } else {
    return req.body != null;
  }
};

// this is a class to make body handling logic extensible if we want to do that
class DefaultBodyHandler implements BodyHandler {
  async parseInitialRequestBody(req: $Request): Promise<void> {
    if (req.is('application/json')) {
      return await new Promise(resolve => bodyParser.json()(req, null, resolve));
    } else if (req.is('text/*')) {
      return await new Promise(resolve => bodyParser.text()(req, null, resolve));
    } else {
      logger.warn(
        req,
        `WARNING: skipping parsing for content-type "${String(req.get('content-type'))}"`
      );
    }
  }

  restreamInitialRequestBody(req: $Request): * {
    if (validRequestBody(req)) {
      const content: string =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body) ?? '';
      if (req.get('content-length') !== String(content.length)) {
        req.headers['content-length'] = String(content.length);
      }
      return streamify([content]);
    }
  }

  serializeRequestBody(req: $Request): ?string {
    const useBody = validRequestBody(req);
    if (!useBody) {
      return undefined;
    }
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  parseInterceptedResponseBody(body: any, response: typeof request.Response): string | any {
    if (typeof body === 'string') {
      try {
        const isJsonType =
          (response.headers['content-type'] ?? '').match('application/json') != null;
        if (isJsonType) {
          return JSON.parse(body);
        }
      } catch (e) {
        return body;
      }
    }
    return body;
  }
}

export const defaultBodyHandler: DefaultBodyHandler = new DefaultBodyHandler();
