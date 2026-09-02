/**
 * Checks every admin path the public site can link to against the admin
 * panel's own route table.
 *
 * The two apps are separate builds with no shared types, so nothing else
 * catches a pencil that points at a route the panel does not have — the link
 * simply opens and the admin's catch-all bounces the editor to /dashboard,
 * which reads as "the edit button is broken" and is exactly what the previous
 * generation of inline edit links did for years while nobody noticed, because
 * the component receiving those paths had been stubbed to render nothing.
 *
 * What it does:
 *   1. Parses <Route path="..."> out of app/admin/src/App.tsx.
 *   2. Calls every builder in lib/adminEditRoutes.ts, with an id and without,
 *      so both the record form and the list fallback are covered.
 *   3. Matches each produced path against the route patterns, treating
 *      :params as single-segment wildcards.
 *   4. Re-derives the permission module for each path and checks it against
 *      the admin's own MODULES table.
 *
 * Run: npm run verify:admin-routes   (also wired into `npm run verify`)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const adminRoot = resolve(webRoot, "../admin");

/* ── 1. the admin's real routes ─────────────────────────────────────────── */

const appTsx = readFileSync(resolve(adminRoot, "src/App.tsx"), "utf8");
const routePatterns = [...appTsx.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => p !== "*" && p !== "/login")
  .map((p) => p.replace(/^\/+/, ""));

if (routePatterns.length < 100) {
  console.error(
    `Only ${routePatterns.length} routes parsed out of the admin router — the ` +
      `parse is probably wrong, refusing to report a pass on it.`,
  );
  process.exit(1);
}

/** ":id" matches one segment; everything else is literal. */
const toRegExp = (pattern) =>
  new RegExp(
    `^${pattern
      .split("/")
      .map((seg) => (seg.startsWith(":") ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
      .join("/")}$`,
  );

const routeRegExps = routePatterns.map(toRegExp);
const routeExists = (path) => routeRegExps.some((re) => re.test(path));

/* ── 2. the admin's module table, to check derivation against ───────────── */

const permissionsTs = readFileSync(
  resolve(adminRoot, "src/features/auth/permissions.ts"),
  "utf8",
);
const modulesBlock = permissionsTs.slice(
  permissionsTs.indexOf("export const MODULES"),
  permissionsTs.indexOf("/** Paths every signed-in admin"),
);
const adminModules = [...modulesBlock.matchAll(/key:\s*'([^']+)'[^}]*?routePrefixes:\s*\[([^\]]*)\]/g)]
  .map(([, key, prefixes]) => ({
    key,
    prefixes: [...prefixes.matchAll(/'([^']+)'/g)].map((m) => m[1].replace(/^\/+/, "")),
  }));

const adminModuleForPath = (path) => {
  let best = null;
  for (const mod of adminModules) {
    for (const prefix of mod.prefixes) {
      if ((path === prefix || path.startsWith(`${prefix}/`)) && (!best || prefix.length > best.len)) {
        best = { key: mod.key, len: prefix.length };
      }
    }
  }
  return best?.key ?? null;
};

/* ── 3. load the catalogue (TS → JS in memory) ──────────────────────────── */

const bundled = await build({
  entryPoints: [resolve(webRoot, "src/lib/adminEditRoutes.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const mod = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);
const { adminRoutes, moduleForAdminPath } = mod;

/* ── 4. exercise every builder ──────────────────────────────────────────── */

/* Builders take between zero and two ids. Calling with a full set and with
   none covers both the record form and the list fallback — the two shapes
   every builder can produce. */
const ARG_SETS = [[], ["ID1"], ["ID1", "ID2"]];

const failures = [];
let checked = 0;

for (const [group, builders] of Object.entries(adminRoutes)) {
  for (const [name, build_] of Object.entries(builders)) {
    if (typeof build_ !== "function") continue;

    for (const args of ARG_SETS) {
      if (args.length > build_.length) continue;
      /* podcast.pageStep takes (pageId, step:number) — feed it a real step. */
      const call = group === "podcast" && name === "pageStep" ? ["ID1", 4] : args;
      if (call.length < build_.length && group === "podcast") continue;

      let path;
      try {
        path = build_(...call);
      } catch (err) {
        failures.push(`${group}.${name}(${call.join(", ")}) threw: ${err.message}`);
        continue;
      }

      checked += 1;
      const bare = path.split("?")[0];

      if (!routeExists(bare)) {
        failures.push(
          `${group}.${name}(${call.join(", ")}) -> "${path}" has no matching <Route> in the admin router`,
        );
      }

      if (/\/(undefined|null)(\/|$)/.test(bare)) {
        failures.push(`${group}.${name}(${call.join(", ")}) -> "${path}" interpolated an empty id`);
      }

      const ours = moduleForAdminPath(path);
      const theirs = adminModuleForPath(bare);
      if (ours !== theirs) {
        failures.push(
          `${group}.${name}(${call.join(", ")}) -> "${path}" resolves to module "${ours}" here but "${theirs}" in the admin`,
        );
      }
    }
  }
}

/* ── 5. report ──────────────────────────────────────────────────────────── */

console.log(
  `Checked ${checked} generated paths against ${routePatterns.length} admin routes ` +
    `and ${adminModules.length} permission modules.`,
);

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("All admin edit routes resolve, and every module derivation agrees.");
