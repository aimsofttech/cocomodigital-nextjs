/**
 * Starts the Next.js marketing site (app/web) on port 3000.
 *
 * Replaces the previous inline `wait-on -t 120000 http://localhost:5000/health
 * && cd app/web && npm run dev`. That form had one fatal property: `&&` meant a
 * failed health check ABORTED the web server. `/health` reports 503 until
 * Mongo connects, and Mongo is remote — so any DB hiccup, VPN drop, or API
 * boot error left nothing at all listening on port 3000, with the cause buried
 * in concurrently's interleaved output.
 *
 * The wait is a courtesy (first paint fetches the API), not a prerequisite:
 * Next renders fine without it and recovers once the API appears. So we still
 * wait, but we ALWAYS start the dev server, and say plainly which of the two
 * happened.
 *
 * Wired up as the `dev:web` script in the root package.json.
 */
const { spawn } = require('child_process');
const path = require('path');

const HEALTH_URL = process.env.API_HEALTH_URL || 'http://localhost:5000/health';
const TIMEOUT_MS = Number(process.env.API_WAIT_TIMEOUT_MS || 120000);
const POLL_MS = 1000;
const WEB_DIR = path.join(__dirname, '..', 'app', 'web');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resolves true once /health returns 200 (Mongo connected), false on timeout. */
async function waitForApi() {
  const deadline = Date.now() + TIMEOUT_MS;
  let announced = false;
  while (Date.now() < deadline) {
    try {
      /* A 503 is a healthy API with a disconnected DB — keep waiting, since
         serving the site against a DB-less API just renders empty sections. */
      const res = await fetch(HEALTH_URL, {
        signal: AbortSignal.timeout(POLL_MS * 3),
      });
      if (res.ok) return true;
    } catch {
      // API not listening yet.
    }
    if (!announced) {
      console.log(`[dev-web] waiting for the API at ${HEALTH_URL} …`);
      announced = true;
    }
    await sleep(POLL_MS);
  }
  return false;
}

function startNext() {
  /* npm resolves through a shell on Windows (npm.cmd), so shell:true is
     required for the command to be found at all. */
  const child = spawn('npm', ['run', 'dev'], {
    cwd: WEB_DIR,
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code, signal) => {
    process.exit(code === null ? (signal ? 1 : 0) : code);
  });
  child.on('error', (err) => {
    console.error('[dev-web] failed to start the web dev server:', err.message);
    process.exit(1);
  });
}

waitForApi().then((healthy) => {
  if (healthy) {
    console.log('[dev-web] API healthy — starting the web dev server.');
  } else {
    console.warn(
      `[dev-web] API did not become healthy within ${Math.round(
        TIMEOUT_MS / 1000,
      )}s (${HEALTH_URL}).`,
    );
    console.warn(
      '[dev-web] Starting the web dev server anyway — pages that fetch the ' +
        'API will render empty until it comes up. Check the [API] output above.',
    );
  }
  startNext();
});
