#!/usr/bin/env node
'use strict';

const axios = require('axios');
const crypto = require('crypto');

/**
 * Parse a WWW-Authenticate: Digest header value into a field map.
 * @param {string} header
 * @returns {Object}
 */
function parseDigestChallenge(header) {
  const fields = {};
  const scheme = header.split(' ')[0];
  if (scheme.toLowerCase() !== 'digest') {
    throw new Error(`Unsupported authentication scheme: ${scheme}`);
  }
  // Match key="value" or key=value pairs
  const re = /(\w+)=(?:"([^"]*?)"|([^,\s]*))/g;
  let match;
  while ((match = re.exec(header)) !== null) {
    fields[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return fields;
}

/**
 * Compute the Digest Authorization header value.
 * Supports qop=auth and no-qop modes with MD5.
 *
 * @param {string} method  - HTTP method (e.g. 'GET')
 * @param {string} uri     - Request URI path
 * @param {string} user    - Username (public key)
 * @param {string} password - Password (private key)
 * @param {Object} challenge - Parsed WWW-Authenticate fields
 * @returns {string} Authorization header value
 */
function buildDigestAuth(method, uri, user, password, challenge) {
  const { realm, nonce, qop, opaque, algorithm } = challenge;

  const algo = (algorithm || 'MD5').toUpperCase().replace('-SESS', '');
  const hash = (data) => {
    if (algo === 'SHA-256') {
      return crypto.createHash('sha256').update(data).digest('hex');
    }
    return crypto.createHash('md5').update(data).digest('hex');
  };

  const ha1 = hash(`${user}:${realm}:${password}`);
  const ha2 = hash(`${method.toUpperCase()}:${uri}`);

  let response;
  let nc;
  let cnonce;
  let authHeader;

  if (qop && qop.split(',').map((s) => s.trim()).includes('auth')) {
    nc = '00000001';
    cnonce = crypto.randomBytes(8).toString('hex');
    response = hash(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
    authHeader =
      `Digest username="${user}", realm="${realm}", nonce="${nonce}", ` +
      `uri="${uri}", qop=auth, nc=${nc}, cnonce="${cnonce}", ` +
      `response="${response}", algorithm=${algorithm || 'MD5'}` +
      (opaque ? `, opaque="${opaque}"` : '');
  } else {
    response = hash(`${ha1}:${nonce}:${ha2}`);
    authHeader =
      `Digest username="${user}", realm="${realm}", nonce="${nonce}", ` +
      `uri="${uri}", response="${response}", algorithm=${algorithm || 'MD5'}` +
      (opaque ? `, opaque="${opaque}"` : '');
  }

  return authHeader;
}

/**
 * Perform an HTTP request with Digest Authentication.
 * Reads PUBLIC_KEY and PRIVATE_KEY from environment variables.
 *
 * @param {string} url - The URL to request
 * @param {string} [method='GET'] - HTTP method
 * @param {*} [data] - Optional request body
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function digestRequest(url, method = 'GET', data = undefined) {
  const publicKey = process.env.PUBLIC_KEY;
  const privateKey = process.env.PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error(
      'Missing credentials. Please set the PUBLIC_KEY and PRIVATE_KEY environment variables.'
    );
  }

  const parsedUrl = new URL(url);
  const uri = parsedUrl.pathname + parsedUrl.search;

  // Step 1 – unauthenticated request to obtain the WWW-Authenticate challenge
  let challengeHeader;
  try {
    // If the server responds with 2xx, no Digest auth is required; return immediately.
    return await axios({ method, url, data });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      challengeHeader = err.response.headers['www-authenticate'];
      if (!challengeHeader) {
        throw new Error('401 response missing WWW-Authenticate header.');
      }
    } else {
      throw err;
    }
  }

  // Step 2 – build the Authorization header and resend
  const challenge = parseDigestChallenge(challengeHeader);
  const authHeader = buildDigestAuth(method, uri, publicKey, privateKey, challenge);

  const response = await axios({
    method,
    url,
    data,
    headers: { Authorization: authHeader },
  });

  return response;
}

module.exports = {
  parseDigestChallenge,
  buildDigestAuth,
  digestRequest,
};
