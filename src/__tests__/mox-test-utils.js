// @flow
// (Copyright) Confluent, Inc.
import http from 'http';

import request from 'request';

export const getRequest = (targetUrl: string, url: string) => {
  return new Promise<{ body: any, response: http.IncomingMessage }>((resolve, reject) => {
    request({ method: 'GET', url: `${targetUrl}${url}` }, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve({ body, response });
      }
    });
  });
};

export const postRequest = (
  targetUrl: string,
  url: string,
  postBody: mixed,
  contentType: string
) => {
  return new Promise<{ body: any, response: http.IncomingMessage }>((resolve, reject) => {
    request(
      {
        method: 'POST',
        url: `${targetUrl}${url}`,
        json: contentType === 'application/json',
        body: postBody,
        headers: {
          'content-type': contentType,
        },
      },
      (err, response, body) => {
        if (err) {
          reject(err);
        } else {
          resolve({ body, response });
        }
      }
    );
  });
};
