const crypto = require('crypto');
const { URLSearchParams } = require('url');

function base64url(buffer) {
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateCodeVerifier() {
  return base64url(crypto.randomBytes(32));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

async function main() {
  const verifier = generateCodeVerifier();
  const challenge = base64url(sha256(verifier));

  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: 'sample-client',
    redirect_uri: 'http://localhost:9000/cb',
    scope: 'openid',
    state: 'sample-state',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const authorizeUrl = `http://localhost:3000/authorize?${authParams.toString()}`;

  console.log('1) Open the authorize URL in a browser (or visit it manually):');
  console.log(authorizeUrl);
  console.log('---');

  console.log('2) In mock mode the server will ultimately issue code=mock-code.');
  console.log('   Using that code to exchange for tokens now...');

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code: 'mock-code',
    redirect_uri: 'http://localhost:9000/cb',
    client_id: 'sample-client',
    code_verifier: verifier,
  }).toString();

  try {
    const resp = await fetch('http://localhost:3000/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });

    const data = await resp.json();
    console.log('Token endpoint response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to call token endpoint:', e);
  }
}

main();
