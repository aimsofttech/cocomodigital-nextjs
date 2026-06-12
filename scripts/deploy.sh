#!/usr/bin/env bash
#
# deploy.sh — Deploy the cocomadigital.com monorepo (web + api + admin).
#
#   Frontend (Next.js)      https://cocomadigital.com        pm2 "cocomadigital" :3002
#   Backend  (Express/Mongo) https://cocomadigital.com/api    pm2 "cocoma-api"    :5000
#   Admin    (Vite SPA)      https://cocomadigital.com/admin  static, served by Apache
#
# What it does, every run:
#   1. Pulls the latest code (clean `git reset --hard origin/$BRANCH`).
#   2. Re-applies the three small production patches the repo needs (idempotent).
#   3. Installs deps and builds all three apps.
#   4. Reloads the pm2 processes and fixes admin file permissions.
#   5. Runs HTTP health checks.
#
# NOTE on secrets: the per-app env files (app/api/.env, app/web/.env.production,
#   app/admin/.env.production) are NOT in git and are NOT touched by this script.
#   They live on disk and survive `git reset --hard`. If one is missing the script
#   stops and tells you which — recreate it before deploying.
#
# WARNING: `git reset --hard` discards any *uncommitted, tracked* local edits in
#   the repo. Untracked files (your env files, this script) are left alone.
#
# Usage:
#   ./scripts/deploy.sh              # full deploy
#   SKIP_INSTALL=1 ./scripts/deploy.sh   # skip npm install (code-only change, deps unchanged)
#   BRANCH=some-branch ./scripts/deploy.sh
#
set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
REPO="/www/wwwroot/cocomadigital.com/cocomo"
WEB_DIR="$REPO/app/web"
API_DIR="$REPO/app/api"
ADMIN_DIR="$REPO/app/admin"
ADMIN_DIST="$ADMIN_DIR/dist"

BRANCH="${BRANCH:-main}"
WEB_PORT=3002
API_PORT=5000
SITE_URL="https://cocomadigital.com"
APACHECTL="/www/server/apache/bin/apachectl"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m    ✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m    ! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m    ✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -d "$REPO/.git" ] || die "Repo not found at $REPO (expected a git checkout)."

# ----------------------------------------------------------------------------
# 1. Pull latest code
# ----------------------------------------------------------------------------
log "Pulling latest code ($BRANCH)"
cd "$REPO"
git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"
ok "Now at $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# ----------------------------------------------------------------------------
# 2. Re-apply production patches (idempotent; abort if an anchor is gone)
# ----------------------------------------------------------------------------
log "Applying production patches"

# (a) Admin built/served under /admin — vite base path.
if grep -q "base: '/admin/'" "$ADMIN_DIR/vite.config.ts"; then
  ok "vite base already set"
else
  perl -0pi -e "s/defineConfig\(\{/defineConfig({\n  base: '\/admin\/',/" "$ADMIN_DIR/vite.config.ts"
  grep -q "base: '/admin/'" "$ADMIN_DIR/vite.config.ts" || die "could not patch vite.config.ts base (upstream changed?)"
  ok "patched vite.config.ts base"
fi

# (b) React Router basename so SPA routes resolve under /admin.
if grep -q 'basename="/admin"' "$ADMIN_DIR/src/main.tsx"; then
  ok "router basename already set"
else
  sed -i 's#<BrowserRouter>#<BrowserRouter basename="/admin">#' "$ADMIN_DIR/src/main.tsx"
  grep -q 'basename="/admin"' "$ADMIN_DIR/src/main.tsx" || die "could not patch main.tsx basename (upstream changed?)"
  ok "patched main.tsx basename"
fi

# (c) API runs behind the Apache reverse proxy — trust the first hop.
if grep -q "trust proxy" "$API_DIR/src/server.js"; then
  ok "trust proxy already set"
else
  perl -0pi -e "s/const app = express\(\);/const app = express();\napp.set('trust proxy', 1);/" "$API_DIR/src/server.js"
  grep -q "trust proxy" "$API_DIR/src/server.js" || die "could not patch server.js trust proxy (upstream changed?)"
  ok "patched server.js trust proxy"
fi

# ----------------------------------------------------------------------------
# 3. Verify env files exist (secrets live here; not in git)
# ----------------------------------------------------------------------------
log "Checking env files"
for ef in "$API_DIR/.env" "$WEB_DIR/.env.production" "$ADMIN_DIR/.env.production"; do
  [ -f "$ef" ] || die "Missing env file: $ef  (recreate it before deploying — it holds secrets)."
  ok "$(echo "$ef" | sed "s#$REPO/##")"
done

# ----------------------------------------------------------------------------
# 4. Install deps + build
# ----------------------------------------------------------------------------
if [ "${SKIP_INSTALL:-0}" = "1" ]; then
  warn "SKIP_INSTALL=1 — skipping npm install"
else
  log "Installing dependencies (api + admin workspaces)"
  ( cd "$REPO" && npm install --no-audit --no-fund )
  log "Installing dependencies (web)"
  ( cd "$WEB_DIR" && npm install --no-audit --no-fund )
fi

log "Building admin (Vite SPA)"
( cd "$ADMIN_DIR" && npm run build )
[ -f "$ADMIN_DIST/index.html" ] || die "admin build produced no dist/index.html"
ok "admin built"

log "Building web (Next.js)"
( cd "$WEB_DIR" && npm run build )
[ -d "$WEB_DIR/build" ] || die "web build produced no build/ output (distDir)"
ok "web built"

# ----------------------------------------------------------------------------
# 5. Admin static perms — Apache (user 'www') must be able to read dist
# ----------------------------------------------------------------------------
log "Fixing admin static permissions"
chmod o+rx /www/wwwroot/cocomadigital.com "$REPO" "$REPO/app" "$ADMIN_DIR" 2>/dev/null || true
chmod -R o+rX "$ADMIN_DIST"
ok "perms set"

# ----------------------------------------------------------------------------
# 6. (Re)start pm2 processes
# ----------------------------------------------------------------------------
log "Restarting backend API (pm2 cocoma-api)"
if pm2 describe cocoma-api >/dev/null 2>&1; then
  pm2 reload cocoma-api --update-env
else
  ( cd "$API_DIR" && pm2 start src/server.js --name cocoma-api )
fi
ok "cocoma-api online (:$API_PORT)"

log "Restarting frontend (pm2 cocomadigital)"
if pm2 describe cocomadigital >/dev/null 2>&1; then
  pm2 reload cocomadigital --update-env
else
  pm2 start "$WEB_DIR/node_modules/next/dist/bin/next" --name cocomadigital --cwd "$WEB_DIR" -- start --port "$WEB_PORT"
fi
ok "cocomadigital online (:$WEB_PORT)"

pm2 save >/dev/null 2>&1 || true

# Optional: reload Apache only if requested (routing/static config rarely changes).
if [ "${RELOAD_APACHE:-0}" = "1" ]; then
  log "Reloading Apache (graceful)"
  "$APACHECTL" -k graceful && ok "apache reloaded"
fi

# ----------------------------------------------------------------------------
# 7. Health checks
# ----------------------------------------------------------------------------
log "Health checks ($SITE_URL)"
check() { # name  url  [expected_code]
  local name="$1" url="$2" want="${3:-200}"
  local code
  code=$(curl -s -k --max-time 30 -o /dev/null -w '%{http_code}' "$url" || echo 000)
  if [ "$code" = "$want" ]; then ok "$name -> $code"; else warn "$name -> $code (expected $want)"; FAILED=1; fi
}
FAILED=0
# give the just-reloaded processes a moment to bind
sleep 3
check "frontend  /"                 "$SITE_URL/"
check "backend   /api/home"         "$SITE_URL/api/home"
check "admin     /admin/"           "$SITE_URL/admin/"
check "admin SPA /admin/dashboard"  "$SITE_URL/admin/dashboard"

if [ "${FAILED:-0}" = "1" ]; then
  warn "One or more health checks failed — inspect logs:  pm2 logs cocoma-api   |   pm2 logs cocomadigital"
  exit 1
fi

log "Deployment complete ✅"
pm2 status 2>/dev/null | grep -E "cocomadigital|cocoma-api" || true
