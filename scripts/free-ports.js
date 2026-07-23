/**
 * Frees the dev-server ports before `npm run dev`.
 *
 * On Windows, nodemon/concurrently frequently leave orphaned node
 * processes holding the API (5000), web (3000), admin (5173), or CRM
 * (5174) ports after a dev session ends, which makes the next
 * `npm run dev` crash with EADDRINUSE. This script kills whatever is
 * still LISTENING on those ports so the stack always starts clean.
 * Wired up as the `predev` script in the root package.json.
 */
const { execSync } = require('child_process');

const PORTS = [3000, 5000, 5173, 5174];

function listeningPids(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano -p TCP', { encoding: 'utf8' });
      const pids = out
        .split(/\r?\n/)
        .filter((line) => line.includes('LISTENING'))
        .filter((line) => new RegExp(`[:\\]]${port}\\s`).test(line))
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && pid !== '0');
      return [...new Set(pids)];
    }
    const out = execSync(`lsof -ti tcp:${port} -s tcp:LISTEN`, {
      encoding: 'utf8',
    });
    return [...new Set(out.split(/\s+/).filter(Boolean))];
  } catch {
    return []; // nothing listening (or lookup tool unavailable)
  }
}

function kill(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(Number(pid), 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

let killedAny = false;
for (const port of PORTS) {
  for (const pid of listeningPids(port)) {
    const ok = kill(pid);
    killedAny = true;
    console.log(
      ok
        ? `[free-ports] killed stale process ${pid} on port ${port}`
        : `[free-ports] could not kill process ${pid} on port ${port} — free it manually`,
    );
  }
}
if (!killedAny) {
  console.log('[free-ports] ports 3000/5000/5173/5174 already free');
}
