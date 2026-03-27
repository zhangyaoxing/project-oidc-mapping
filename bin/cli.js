#!/usr/bin/env node
'use strict';

const { digestRequest } = require('../src/client');

function printHelp() {
  console.log(
    [
      'Usage: rest-client <url> [method] [body]',
      '',
      'Arguments:',
      '  url     The URL to send the request to (required)',
      '  method  HTTP method: GET, POST, PUT, PATCH, DELETE (default: GET)',
      '  body    JSON body for POST/PUT/PATCH requests (optional)',
      '',
      'Environment variables:',
      '  PUBLIC_KEY   Your API public key (username for Digest auth)',
      '  PRIVATE_KEY  Your API private key (password for Digest auth)',
      '',
      'Examples:',
      '  rest-client https://example.com/api/resource',
      '  rest-client https://example.com/api/resource POST \'{"key":"value"}\'',
    ].join('\n')
  );
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const url = args[0];
  const method = (args[1] || 'GET').toUpperCase();
  let body;

  if (args[2]) {
    try {
      body = JSON.parse(args[2]);
    } catch {
      console.error('Error: body must be valid JSON.');
      process.exit(1);
    }
  }

  try {
    // Validate URL format early for clearer CLI feedback.
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    console.error('Error: url must be a valid URL.');
    process.exit(1);
  }

  try {
    const response = await digestRequest(url, method, body);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Response:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
