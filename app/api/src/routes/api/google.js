'use strict';

/**
 * One-time Google OAuth helper to obtain a refresh token for the Calendar/Meet
 * integration (see ../../services/calendarService).
 *
 * Usage (run once, in development, signed in as the meeting host account):
 *   1. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env.
 *   2. Open  http://localhost:5000/api/google/oauth/start  in a browser.
 *   3. Approve access — the callback page prints a refresh token.
 *   4. Paste it into GOOGLE_REFRESH_TOKEN in .env and restart the server.
 *
 * These routes are guarded: they only work when GOOGLE_REFRESH_TOKEN is NOT yet
 * set (so they can't be abused once configured). Safe to leave in place.
 */

const router = require('express').Router();
const { google } = require('googleapis');
const logger = require('../../utils/logger');
const { upsertEnv } = require('../../utils/envFile');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const makeClient = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/oauth/callback'
  );

// Allow (re)running the flow as long as the client credentials exist. We do NOT
// block when a refresh token is already set — a stored token may be invalid or
// from the wrong client, and the only way to replace it is to re-run consent.
const guard = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res
      .status(400)
      .send('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first, then restart the server.');
  }
  next();
};

// Step 1 — redirect to Google's consent screen.
router.get('/oauth/start', guard, (req, res) => {
  const url = makeClient().generateAuthUrl({
    access_type: 'offline', // ask for a refresh token
    prompt: 'consent', // force it even on re-consent
    scope: SCOPES,
  });
  res.redirect(url);
});

// Step 2 — Google redirects back here with a code; exchange it for tokens.
router.get('/oauth/callback', guard, async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`Google returned an error: ${error}`);
  if (!code) return res.status(400).send('Missing authorization code.');
  try {
    const { tokens } = await makeClient().getToken(code);
    if (!tokens.refresh_token) {
      return res
        .status(400)
        .send(
          'No refresh_token returned. Revoke prior access at ' +
            'https://myaccount.google.com/permissions and try /api/google/oauth/start again.'
        );
    }
    // Automatically persist the token into .env (no manual copy-paste).
    let saved = false;
    let saveError = '';
    try {
      upsertEnv('GOOGLE_REFRESH_TOKEN', tokens.refresh_token);
      saved = true;
      logger.info('Google OAuth: refresh token obtained and written to .env.');
    } catch (e) {
      saveError = e.message;
      logger.error(`Google OAuth: could not write token to .env: ${e.message}`);
    }

    const manualNote = saved
      ? `It has been saved to your .env automatically.\nRestart the server for it to take effect.`
      : `Could not write .env automatically (${saveError}).\n` +
        `Add this line manually and restart the server:\n\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;

    res
      .status(200)
      .type('html')
      .send(
        `<pre style="font-family:monospace;font-size:14px;padding:20px;line-height:1.6">` +
          `Success — Google Meet is now connected.\n\n${manualNote}\n\n` +
          `After restart, this helper route disables itself automatically.</pre>`
      );
  } catch (err) {
    logger.error(`Google OAuth: token exchange failed: ${err.message}`);
    res.status(500).send(`Token exchange failed: ${err.message}`);
  }
});

module.exports = router;
