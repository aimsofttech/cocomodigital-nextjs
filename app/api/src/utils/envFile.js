'use strict';

/**
 * Tiny helper to persist a single key into the project .env file.
 *
 * Used by the Google OAuth helper so the captured refresh token is written
 * automatically (no manual copy-paste). Resolves the .env path relative to this
 * file (app/api/.env) so it works regardless of the process cwd.
 *
 * NOTE: dotenv only reads .env at boot, so callers should still restart the
 * server for the new value to take effect.
 */

const fs = require('fs');
const path = require('path');

// src/utils/envFile.js → ../../.env === app/api/.env
const ENV_PATH = path.resolve(__dirname, '../../.env');

const enc = (v) => {
  const s = String(v == null ? '' : v);
  // Quote if it contains whitespace or characters that confuse dotenv parsing.
  return /[\s#'"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
};

/**
 * Insert or replace `KEY=value` in .env. Updates in place if the key exists
 * (preserving the rest of the file), otherwise appends it.
 * @returns {{ path:string, updated:boolean }}
 */
const upsertEnv = (key, value) => {
  let content = '';
  try {
    content = fs.readFileSync(ENV_PATH, 'utf8');
  } catch (_) {
    content = ''; // .env missing — we'll create it
  }

  const line = `${key}=${enc(value)}`;
  // Match an existing assignment for this key (allowing leading spaces).
  const re = new RegExp(`^[ \\t]*${key}=.*$`, 'm');
  let updated;
  if (re.test(content)) {
    content = content.replace(re, line);
    updated = true;
  } else {
    if (content.length && !content.endsWith('\n')) content += '\n';
    content += `${line}\n`;
    updated = false;
  }

  fs.writeFileSync(ENV_PATH, content, 'utf8');
  // Reflect immediately in the running process too (best-effort).
  process.env[key] = String(value);
  return { path: ENV_PATH, updated };
};

module.exports = { upsertEnv, ENV_PATH };
