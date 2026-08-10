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

/** Port out of a netstat local-address column (`0.0.0.0:3000`, `[::1]:5173`). */
function addressPort(address) {
  const i = address.lastIndexOf(':');
  return i === -1 ? NaN : Number(address.slice(i + 1));
}

function listeningPids(port) {
  try {
    if (process.platform === 'win32') {
      /* `-p TCP` restricts the listing to IPv4 only — IPv6 sockets live in a
         separate `TCPv6` section. Vite binds `localhost`, which resolves to
         ::1 first on Windows, so every stale Vite server was invisible here
         and survived the sweep (admin/CRM then drift to 5175/5176). Listing
         everything and filtering on the parsed columns catches both families. */
      const out = execSync('netstat -ano', { encoding: 'utf8' });
      const pids = out
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/))
        /* proto, local, foreign, state, pid — match the LOCAL address only, so
           an outbound connection to :3000 never gets mistaken for a listener. */
        .filter((c) => c.length >= 5 && (c[0] === 'TCP' || c[0] === 'TCPv6'))
        .filter((c) => c[3] === 'LISTENING' && addressPort(c[1]) === port)
        .map((c) => c[4])
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
  console.log(`[free-ports] ports ${PORTS.join('/')} already free`);
}
