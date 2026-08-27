'use strict';

/**
 * Validates Twilio's `X-Twilio-Signature` header on the public webhook routes.
 *
 * Twilio builds the signature by taking the exact URL it called, appending every
 * POST parameter in alphabetical order as key+value, HMAC-SHA1'ing that string
 * with the account auth token and base64-encoding the result.
 * https://www.twilio.com/docs/usage/security#validating-requests
 *
 * Implemented with node crypto rather than the twilio SDK — these routes are the
 * only place the project would use it, and the algorithm is four lines.
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');

const expectedSignature = (authToken, url, params) => {
  const data = Object.keys(params || {})
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
};

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  // timingSafeEqual throws on length mismatch, so compare lengths first.
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const verifyTwilioSignature = (req, res, next) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // No auth token → Twilio isn't wired up at all, so there is nothing to verify
  // and nothing an attacker could impersonate.
  if (!authToken) return next();
  // Escape hatch for local tunnels where the signed URL can't be reproduced.
  if (process.env.TWILIO_VALIDATE_WEBHOOKS === 'false') return next();

  const signature = req.get('X-Twilio-Signature');
  if (!signature) {
    logger.warn(`Rejected unsigned Twilio webhook: ${req.originalUrl}`);
    return res.sendStatus(403);
  }

  // Twilio signs the URL exactly as entered in the console. Behind a proxy or
  // load balancer req.protocol/req.host describe the internal hop, not that URL,
  // so rebuild from the configured public base whenever we have one.
  const base = (process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const url = base + req.originalUrl;

  if (!safeEqual(signature, expectedSignature(authToken, url, req.body))) {
    logger.warn(`Rejected Twilio webhook with an invalid signature: ${url}`);
    return res.sendStatus(403);
  }
  return next();
};

module.exports = { verifyTwilioSignature, expectedSignature };
