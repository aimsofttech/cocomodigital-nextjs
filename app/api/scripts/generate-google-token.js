'use strict';

/**
 * One-time Google OAuth → refresh token generator (for Google Meet / Calendar).
 *
 * Run:   node scripts/generate-google-token.js     (from app/api)
 *
 * It reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI from
 * .env, prints a consent URL, starts a tiny local server on the redirect URI's
 * port to catch Google's callback, exchanges the code, and writes
 * GOOGLE_REFRESH_TOKEN straight into .env. Then restart the API server.
 *
 * Prerequisites (one-time, in Google Cloud Console):
 *   - Enable the Google Calendar API.
 *   - Register the exact GOOGLE_REDIRECT_URI under the OAuth client's
 *     "Authorized redirect URIs".
 *   - Add your Google account as a Test user (or Publish the consent screen).
 *
 * NOTE: this binds the redirect URI's port (5000 by default), so stop the main
 * API server first, or it won't be able to listen.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const http = require('http');
const { google } = require('googleapis');
const { upsertEnv, ENV_PATH } = require('../src/utils/envFile');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/oauth/callback';

// Only the Calendar scope is needed to create events + Meet links. (Email is
// sent via SMTP/nodemailer, so no Gmail scope is required.)
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n✗ Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in app/api/.env first.\n');
  process.exit(1);
}

let redirect;
try {
  redirect = new URL(REDIRECT_URI);
} catch {
  console.error(`\n✗ GOOGLE_REDIRECT_URI is not a valid URL: ${REDIRECT_URI}\n`);
  process.exit(1);
}
const PORT = Number(redirect.port) || 80;
const CALLBACK_PATH = redirect.pathname;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // request a refresh token
  prompt: 'consent', // force it even on re-consent
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  let reqUrl;
  try {
    reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (reqUrl.pathname !== CALLBACK_PATH) {
    res.writeHead(404);
    return res.end('Not found');
  }

  const error = reqUrl.searchParams.get('error');
  const code = reqUrl.searchParams.get('code');
  if (error) {
    res.writeHead(400);
    res.end(`Google returned an error: ${error}`);
    console.error(`\n✗ Google error: ${error}\n`);
    return finish(1);
  }
  if (!code) {
    res.writeHead(400);
    return res.end('Missing authorization code.');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      res.writeHead(400).end(
        'No refresh_token returned. Revoke prior access at ' +
          'https://myaccount.google.com/permissions and run again.'
      );
      console.error(
        '\n✗ No refresh_token returned. Remove the app at ' +
          'https://myaccount.google.com/permissions, then re-run.\n'
      );
      return finish(1);
    }
    upsertEnv('GOOGLE_REFRESH_TOKEN', tokens.refresh_token);
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(
      '<pre style="font:14px/1.6 monospace;padding:24px">' +
        'Success — GOOGLE_REFRESH_TOKEN was saved to .env.\n' +
        'You can close this tab. Restart the API server to activate Google Meet links.</pre>'
    );
    console.log(`\n✅ GOOGLE_REFRESH_TOKEN saved to ${ENV_PATH}`);
    console.log('   Restart the API server to activate Google Meet links.\n');
    finish(0);
  } catch (e) {
    res.writeHead(500);
    res.end(`Token exchange failed: ${e.message}`);
    console.error(`\n✗ Token exchange failed: ${e.message}\n`);
    finish(1);
  }
});

function finish(code) {
  setTimeout(() => {
    server.close();
    process.exit(code);
  }, 400);
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(
      `\n✗ Port ${PORT} is in use — stop the main API server first, then re-run this script.\n`
    );
  } else {
    console.error(`\n✗ ${e.message}\n`);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('\n──────────────────────────────────────────────────────');
  console.log('  Google OAuth — one-time refresh-token setup');
  console.log('──────────────────────────────────────────────────────');
  console.log(`\n  Redirect URI (must be registered in Console):\n    ${REDIRECT_URI}`);
  console.log('\n  1) Open this URL in your browser and approve access:\n');
  console.log(`     ${authUrl}\n`);
  console.log('  2) After you click Allow, the token saves automatically here.');
  console.log('\n  Waiting for Google to redirect back...\n');
});
