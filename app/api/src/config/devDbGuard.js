'use strict';

/**
 * Development database guard.
 *
 * Preloaded (never required by the app itself):
 *   node -r dotenv/config -r ./src/config/devDbGuard.js src/server.js
 *
 * Refuses to start a non-production process against anything that is not an
 * explicitly development database. This is an ALLOW-list, not a deny-list, so
 * the production host or database name never has to be written down here:
 * a URI is accepted only when it points at localhost/127.0.0.1 or at a
 * database literally named `cocoma_dev`. Everything else stops the process
 * with one message.
 *
 * Why a separate preload rather than a line in server.js: the app entry and
 * `npm run dev` stay byte-for-byte as they were; only `npm run dev:local`
 * opts into this check.
 */

const DEV_DB_NAME = 'cocoma_dev';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** @returns {{host:string, db:string}|null} null if the URI does not parse. */
const parseMongoUri = (uri) => {
  const m = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)\/?([^?]*)/.exec(String(uri || '').trim());
  if (!m) return null;
  // A replica-set URI lists several hosts; every one must be local to count as local.
  const hosts = m[1].split(',').map((h) => h.replace(/:\d+$/, '').toLowerCase());
  return { hosts, db: decodeURIComponent(m[2] || '').trim() };
};

/**
 * @returns {{ok:true}|{ok:false, reason:string}}
 */
const checkDevDatabase = (uri, nodeEnv) => {
  if (nodeEnv === 'production') return { ok: true };
  if (!uri) return { ok: false, reason: 'MONGO_URI is not set.' };
  const parsed = parseMongoUri(uri);
  if (!parsed) return { ok: false, reason: 'MONGO_URI is not a mongodb:// or mongodb+srv:// URI.' };
  const allLocal = parsed.hosts.every((h) => LOCAL_HOSTS.has(h));
  if (allLocal || parsed.db === DEV_DB_NAME) return { ok: true };
  return {
    ok: false,
    reason: `MONGO_URI points at a non-local host and database "${parsed.db || '(default)'}", which is not "${DEV_DB_NAME}".`,
  };
};

const enforce = () => {
  const result = checkDevDatabase(process.env.MONGO_URI, process.env.NODE_ENV);
  if (result.ok) return;
  // One clear message, no URI echoed (it carries credentials).
  console.error(
    '\n[dev-db-guard] Refusing to start.\n'
    + `[dev-db-guard] ${result.reason}\n`
    + '[dev-db-guard] Development processes may only use localhost or a database named '
    + `"${DEV_DB_NAME}". Start with \`npm run dev:local\` and a .env.local that sets MONGO_URI accordingly.\n`
  );
  process.exit(1);
};

// Preload mode (`node -r`): the main module has not loaded yet, so enforce now.
// Plain require from a test or script: just export the functions.
if (require.main === undefined || process.env.DEV_DB_GUARD_ENFORCE === '1') {
  enforce();
}

module.exports = { checkDevDatabase, parseMongoUri, enforce, DEV_DB_NAME };
