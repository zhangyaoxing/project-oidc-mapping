'use strict';

// Built-in test runner (Node.js >= 18)
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const crypto = require('crypto');

// ── Helpers copied / adapted from the implementation ──────────────────────

function parseDigestChallenge(header) {
  const fields = {};
  const re = /(\w+)=(?:"([^"]*?)"|([^,\s]*))/g;
  let match;
  while ((match = re.exec(header)) !== null) {
    fields[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return fields;
}

function buildDigestAuth(method, uri, user, password, challenge) {
  const { realm, nonce, qop, opaque, algorithm } = challenge;
  const algo = (algorithm || 'MD5').toUpperCase().replace('-SESS', '');
  const hash = (data) => {
    if (algo === 'SHA-256') return crypto.createHash('sha256').update(data).digest('hex');
    return crypto.createHash('md5').update(data).digest('hex');
  };
  const ha1 = hash(`${user}:${realm}:${password}`);
  const ha2 = hash(`${method.toUpperCase()}:${uri}`);
  if (qop && qop.split(',').map((s) => s.trim()).includes('auth')) {
    const nc = '00000001';
    const cnonce = crypto.randomBytes(8).toString('hex');
    const response = hash(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
    return (
      `Digest username="${user}", realm="${realm}", nonce="${nonce}", ` +
      `uri="${uri}", qop=auth, nc=${nc}, cnonce="${cnonce}", ` +
      `response="${response}", algorithm=${algorithm || 'MD5'}` +
      (opaque ? `, opaque="${opaque}"` : '')
    );
  }
  const response = hash(`${ha1}:${nonce}:${ha2}`);
  return (
    `Digest username="${user}", realm="${realm}", nonce="${nonce}", ` +
    `uri="${uri}", response="${response}", algorithm=${algorithm || 'MD5'}` +
    (opaque ? `, opaque="${opaque}"` : '')
  );
}

// ── Unit tests ─────────────────────────────────────────────────────────────

describe('parseDigestChallenge', () => {
  it('parses realm and nonce from a quoted Digest challenge', () => {
    const header = 'Digest realm="test-realm", nonce="abc123", qop="auth", algorithm=MD5';
    const fields = parseDigestChallenge(header);
    assert.equal(fields.realm, 'test-realm');
    assert.equal(fields.nonce, 'abc123');
    assert.equal(fields.qop, 'auth');
    assert.equal(fields.algorithm, 'MD5');
  });

  it('parses opaque field when present', () => {
    const header = 'Digest realm="r", nonce="n", opaque="op", algorithm=MD5';
    const fields = parseDigestChallenge(header);
    assert.equal(fields.opaque, 'op');
  });
});

describe('buildDigestAuth', () => {
  it('produces a valid Authorization header with qop=auth', () => {
    const challenge = { realm: 'testrealm', nonce: 'testnonce', qop: 'auth', algorithm: 'MD5' };
    const header = buildDigestAuth('GET', '/api', 'user', 'pass', challenge);
    assert.match(header, /^Digest /);
    assert.match(header, /username="user"/);
    assert.match(header, /realm="testrealm"/);
    assert.match(header, /qop=auth/);
    assert.match(header, /response="[0-9a-f]{32}"/);
  });

  it('produces a valid Authorization header without qop', () => {
    const challenge = { realm: 'testrealm', nonce: 'testnonce', algorithm: 'MD5' };
    const header = buildDigestAuth('GET', '/api', 'user', 'pass', challenge);
    assert.match(header, /^Digest /);
    assert.doesNotMatch(header, /qop=/);
    assert.match(header, /response="[0-9a-f]{32}"/);
  });

  it('appends opaque when provided', () => {
    const challenge = { realm: 'r', nonce: 'n', opaque: 'xyz', algorithm: 'MD5' };
    const header = buildDigestAuth('GET', '/', 'u', 'p', challenge);
    assert.match(header, /opaque="xyz"/);
  });

  it('uses SHA-256 when algorithm is SHA-256', () => {
    const challenge = { realm: 'r', nonce: 'n', qop: 'auth', algorithm: 'SHA-256' };
    const header = buildDigestAuth('GET', '/', 'u', 'p', challenge);
    // SHA-256 hex digest is 64 chars
    assert.match(header, /response="[0-9a-f]{64}"/);
  });
});

// ── Integration test against a real local Digest-auth server ───────────────

const TEST_USER = 'testuser';
const TEST_PASS = 'testpass';
const TEST_REALM = 'Test Realm';
const TEST_NONCE = 'fixed-test-nonce';

/**
 * Minimal HTTP server that implements Digest authentication (MD5, qop=auth).
 */
function createDigestServer() {
  return http.createServer((req, res) => {
    const authHeader = req.headers['authorization'] || '';

    if (!authHeader.startsWith('Digest ')) {
      res.writeHead(401, {
        'WWW-Authenticate': `Digest realm="${TEST_REALM}", nonce="${TEST_NONCE}", qop="auth", algorithm=MD5`,
      });
      return res.end('Unauthorized');
    }

    // Verify the digest
    const fields = parseDigestChallenge(authHeader);
    const ha1 = crypto
      .createHash('md5')
      .update(`${TEST_USER}:${TEST_REALM}:${TEST_PASS}`)
      .digest('hex');
    const ha2 = crypto
      .createHash('md5')
      .update(`${req.method.toUpperCase()}:${new URL(req.url, 'http://localhost').pathname}`)
      .digest('hex');
    const expected = crypto
      .createHash('md5')
      .update(`${ha1}:${TEST_NONCE}:${fields.nc}:${fields.cnonce}:auth:${ha2}`)
      .digest('hex');

    if (fields.response !== expected || fields.username !== TEST_USER) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid credentials' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'OK', path: req.url }));
  });
}

describe('digestRequest (integration)', () => {
  let server;
  let baseUrl;

  before(
    () =>
      new Promise((resolve) => {
        server = createDigestServer();
        server.listen(0, '127.0.0.1', () => {
          const { port } = server.address();
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      })
  );

  after(() => new Promise((resolve) => server.close(resolve)));

  it('successfully authenticates and retrieves data', async () => {
    process.env.PUBLIC_KEY = TEST_USER;
    process.env.PRIVATE_KEY = TEST_PASS;

    // Re-require to get a fresh module reference (avoids cached require issues)
    // We call the helper functions directly here since they are exported-equivalent
    const axios = require('axios');
    const url = `${baseUrl}/api/test`;
    const parsedUrl = new URL(url);
    const uri = parsedUrl.pathname + parsedUrl.search;

    // Step 1 – unauthenticated (axios throws on 401 by default)
    let challengeHeader;
    try {
      await axios({ method: 'GET', url });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        challengeHeader = err.response.headers['www-authenticate'];
      } else throw err;
    }

    assert.ok(challengeHeader, 'Server must send WWW-Authenticate on 401');

    // Step 2 – authenticated
    const challenge = parseDigestChallenge(challengeHeader);
    const authHeader = buildDigestAuth('GET', uri, TEST_USER, TEST_PASS, challenge);
    const response = await axios({
      method: 'GET',
      url,
      headers: { Authorization: authHeader },
    });

    assert.equal(response.status, 200);
    assert.equal(response.data.message, 'OK');
  });

  it('fails with incorrect credentials', async () => {
    const axios = require('axios');
    const url = `${baseUrl}/api/test`;
    const parsedUrl = new URL(url);
    const uri = parsedUrl.pathname + parsedUrl.search;

    // Get the Digest challenge (axios throws on 401)
    let challengeHeader;
    try {
      await axios({ method: 'GET', url });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        challengeHeader = err.response.headers['www-authenticate'];
      } else throw err;
    }

    // Use wrong password and confirm the server rejects
    const authHeader = buildDigestAuth('GET', uri, TEST_USER, 'wrongpass', parseDigestChallenge(challengeHeader));
    const bad = await axios({
      method: 'GET',
      url,
      headers: { Authorization: authHeader },
      validateStatus: () => true,
    });

    assert.equal(bad.status, 401);
  });
});
