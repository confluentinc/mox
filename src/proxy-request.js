// @flow
// (Copyright) Confluent, Inc.
import type { $Request, $Response } from 'express';
import request from 'request';
import { pick, omit } from 'lodash';

import { defaultBodyHandler } from './DefaultBodyHandler';
import { BodyHandler } from './types';
import { logger } from './utils';

type ManualProxyInfo = {
  body: any,
  response: typeof request.Response,
};

const processProxyResponse = async (
  proxyResponse: ManualProxyInfo,
  req: $Request,
  res: $Response
): any => {
  const body = await (defaultBodyHandler: BodyHandler).parseInterceptedResponseBody(
    proxyResponse.body,
    proxyResponse.response
  );
  if (proxyResponse.response.headers != null) {
    res.set(
      omit(
        proxyResponse.response.headers,
        'Content-Length',
        'content-length',
        'content-encoding',
        'Content-Encoding'
      )
    );
  }
  res.status(proxyResponse.response.statusCode);
  return body;
};

const manualProxy = async (targetUrl: string, req: $Request): Promise<ManualProxyInfo> => {
  const requestBody = await defaultBodyHandler.serializeRequestBody(req);
  const details = pick(
    req,
    'httpVersion',
    'httpVersionMajor',
    'httpVersionMinor',
    'method',
    'url',
    'headers'
  );
  const gzip = details.headers?.['accept-encoding'] ? true : false;
  const opts = {
    ...details,
    headers: {
      ...details.headers,
      host: undefined,
      ...(requestBody != null ? { 'content-length': requestBody.length } : {}),
    },
    body: requestBody,
    method: details.method,
    gzip,
    url: targetUrl + req.url,
  };
  const proxyResponse = await new Promise<ManualProxyInfo>((resolve, reject) => {
    request(opts, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve({ body, response });
      }
    });
  });
  return proxyResponse;
};

const proxyRequest = async (targetUrl: string, req: $Request, res: $Response): Promise<*> => {
  const proxyResponse = await manualProxy(targetUrl, req);
  logger.log(req, 'sent to', req.url);
  return await processProxyResponse(proxyResponse, req, res);
};

export const sendToClient = (body: any, res: $Response) => {
  res.removeHeader('transfer-encoding');
  if (typeof body === 'object' && body != null) {
    res.json(body);
  } else {
    res.send(body);
  }
};

export default proxyRequest;
