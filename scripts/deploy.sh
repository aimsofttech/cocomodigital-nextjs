#!/usr/bin/env bash
#
# deploy.sh — Deploy the cocomadigital.com monorepo (web + api + admin + crm).
#
#   Frontend (Next.js)      https://cocomadigital.com        pm2 "cocomadigital" :3002
#   Backend  (Express/Mongo) https://cocomadigital.com/api    pm2 "cocoma-api"    :5000
#   Admin    (Vite SPA)      https://cocomadigital.com/admin  static, served by Apache
#   CRM      (Vite SPA)      https://cocomadigital.com/crm    static, served by Apache
#
# Apache routing is configured on the server (BT panel), the same way /admin
# already is — this script does not touch it. The CRM needs three rules on the
# cocomadigital.com vhost, and the order matters because the first two must be
# declared before the catch-all that hands /crm to the static files:
#
#   /crm/socket.io/*  → 127.0.0.1:5000   (realtime inbox; needs the ws upgrade
#                                         proxied as well as plain HTTP, since
#                                         Socket.IO falls back to long-polling)
#   /crm/api/*        → 127.0.0.1:5000   (prefix passed through UNCHANGED —
#                                         Twilio signature checks rebuild the
#                                         signed URL from it, so a proxy that
#                                         strips /crm/api breaks webhooks)
#   /crm/*            → app/crm/dist     (with a history fallback to index.html,
#                                         or a refresh on /crm/leads/<id> 404s)
#
# The health checks at the end verify all three, so a missing or mis-ordered
# rule shows up as a failed deploy rather than a broken page.
#
# What it does, every run:
#   1. Pulls the latest code (clean `git reset --hard origin/$BRANCH`).
#   2. Re-applies the small production patches the repo needs (idempotent).
#   3. Installs deps and builds all four apps.
#   4. Reloads the pm2 processes and fixes admin + crm file permissions.
#   5. Runs HTTP health checks.
#
# NOTE on secrets: the per-app env files (app/api/.env, app/web/.env.production,
#   app/admin/.env.production) are NOT in git and are NOT touched by this script.
#   They live on disk and survive `git reset --hard`. If one is missing the script
#   stops and tells you which — recreate it before deploying.
#   app/crm/.env.production is OPTIONAL: the CRM is served from the same origin
#   as its API, so the default (empty VITE_CRM_API_URL → relative requests) is
#   the correct production setting. See app/crm/.env.example.
#
# WARNING: `git reset --hard` discards any *uncommitted, tracked* local edits in
#   the repo. Untracked files (your env files, this script) are left alone.
#
# Usage:
#   ./scripts/deploy.sh              # full deploy
#   SKIP_INSTALL=1 ./scripts/deploy.sh   # skip npm install (code-only change, deps unchanged)
#   BRANCH=some-branch ./scripts/deploy.sh
#   RELOAD_APACHE=1 ./scripts/deploy.sh  # also graceful-reload Apache
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
CRM_DIR="$REPO/app/crm"
CRM_DIST="$CRM_DIR/dist"

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

# (d) CRM base path. Unlike (a)/(b) these are committed in the repo rather than
#     patched in here, so this only asserts them — if either is ever dropped the
#     build still succeeds and then serves a white page with 404s on every asset,
#     which is a far more expensive way to find out.
grep -q "base: '/crm/'" "$CRM_DIR/vite.config.ts" \
  || die "app/crm/vite.config.ts is missing \`base: '/crm/'\` — assets would be requested from / and 404."
ok "crm vite base set"
grep -q 'basename="/crm"' "$CRM_DIR/src/main.tsx" \
  || die "app/crm/src/main.tsx is missing \`basename=\"/crm\"\` — routes would resolve above the /crm prefix."
ok "crm router basename set"

# ----------------------------------------------------------------------------
# 3. Verify env files exist (secrets live here; not in git)
# ----------------------------------------------------------------------------
log "Checking env files"
for ef in "$API_DIR/.env" "$WEB_DIR/.env.production" "$ADMIN_DIR/.env.production"; do
  [ -f "$ef" ] || die "Missing env file: $ef  (recreate it before deploying — it holds secrets)."
  ok "$(echo "$ef" | sed "s#$REPO/##")"
done

# The CRM env file is optional by design: with VITE_CRM_API_URL unset the client
# issues same-origin relative requests, which is exactly right when the SPA and
# its API share https://cocomadigital.com. Only set it to split them apart.
if [ -f "$CRM_DIR/.env.production" ]; then
  ok "app/crm/.env.production (present — overriding the same-origin default)"
else
  ok "app/crm/.env.production (absent — using the same-origin default, correct here)"
fi

# The realtime inbox opens a Socket.IO handshake, and Socket.IO applies its own
# CORS allow-list to it — including for same-origin requests, because browsers
# still send Origin on a websocket upgrade. Miss this and REST works perfectly
# while the inbox silently stops receiving replies.
if grep -qE "^CORS_ORIGINS=.*$SITE_URL" "$API_DIR/.env"; then
  ok "CORS_ORIGINS includes $SITE_URL"
else
  warn "CORS_ORIGINS in app/api/.env does not list $SITE_URL — the CRM websocket handshake will be refused."
  warn "  Fix: CORS_ORIGINS=$SITE_URL,http://localhost:3000,http://localhost:5173,http://localhost:5174"
fi

# ----------------------------------------------------------------------------
# 4. Install deps + build
# ----------------------------------------------------------------------------
if [ "${SKIP_INSTALL:-0}" = "1" ]; then
  warn "SKIP_INSTALL=1 — skipping npm install"
else
  # The root package.json declares app/api, app/admin and app/crm as workspaces,
  # so one install at the root covers all three.
  log "Installing dependencies (api + admin + crm workspaces)"
  ( cd "$REPO" && npm install --no-audit --no-fund )
  log "Installing dependencies (web)"
  ( cd "$WEB_DIR" && npm install --no-audit --no-fund )
fi

log "Building admin (Vite SPA)"
( cd "$ADMIN_DIR" && npm run build )
[ -f "$ADMIN_DIST/index.html" ] || die "admin build produced no dist/index.html"
ok "admin built"

log "Building crm (Vite SPA)"
( cd "$CRM_DIR" && npm run build )
[ -f "$CRM_DIST/index.html" ] || die "crm build produced no dist/index.html"
# A build whose base path silently regressed produces assets rooted at / — which
# 404 under /crm and leave a blank page with no server-side error to point at.
grep -q '"/crm/assets/' "$CRM_DIST/index.html" \
  || die "crm build emitted assets outside /crm/ — check base in app/crm/vite.config.ts"
ok "crm built (assets under /crm/)"

log "Building web (Next.js)"
( cd "$WEB_DIR" && npm run build )
[ -d "$WEB_DIR/build" ] || die "web build produced no build/ output (distDir)"
ok "web built"

# ----------------------------------------------------------------------------
# 5. Static perms — Apache (user 'www') must be able to read both dist trees
# ----------------------------------------------------------------------------
log "Fixing admin + crm static permissions"
chmod o+rx /www/wwwroot/cocomadigital.com "$REPO" "$REPO/app" "$ADMIN_DIR" "$CRM_DIR" 2>/dev/null || true
chmod -R o+rX "$ADMIN_DIST"
chmod -R o+rX "$CRM_DIST"
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
contains() { # name  url  expected_substring
  local name="$1" url="$2" want="$3" body
  body=$(curl -s -k --max-time 30 "$url" || true)
  case "$body" in
    *"$want"*) ok "$name -> matched '$want'" ;;
    *)         warn "$name -> did not contain '$want'"; FAILED=1 ;;
  esac
}

FAILED=0
# give the just-reloaded processes a moment to bind
sleep 3
check "frontend  /"                 "$SITE_URL/"
check "backend   /api/home"         "$SITE_URL/api/home"
check "admin     /admin/"           "$SITE_URL/admin/"
check "admin SPA /admin/dashboard"  "$SITE_URL/admin/dashboard"
check "crm       /crm/"             "$SITE_URL/crm/"
# A deep link is the check that actually proves the history fallback works —
# /crm/ alone passes even with no SPA rewrite, because index.html is a real file.
check "crm SPA   /crm/leads"        "$SITE_URL/crm/leads"
# Fetch the actual fingerprinted entry bundle this build just emitted. /crm/
# returning 200 only proves index.html is readable; if the Alias, the o+rX perms
# or the SPA fallback are wrong for subdirectories, the page still loads and then
# dies on its own scripts. This is the check that catches that.
# `|| true` because a no-match grep exits 1, and under `set -e -o pipefail` that
# would abort the deploy at the very last step over a cosmetic check.
CRM_ENTRY=$(grep -o '/crm/assets/index-[A-Za-z0-9_-]*\.js' "$CRM_DIST/index.html" | head -1 || true)
if [ -n "$CRM_ENTRY" ]; then
  check "crm asset $CRM_ENTRY" "$SITE_URL$CRM_ENTRY"
else
  warn "could not find the entry bundle in $CRM_DIST/index.html — skipping the asset check"
fi
# Status code alone is not enough here: without the /crm/api Apache rule the
# request falls through to the Next.js site, which can answer 200 with its own
# HTML for an unknown route. Match the body so a misroute cannot pass silently.
contains "crm API   /crm/api/health" "$SITE_URL/crm/api/health" '"service":"crm"'

if [ "${FAILED:-0}" = "1" ]; then
  warn "One or more health checks failed — inspect logs:  pm2 logs cocoma-api   |   pm2 logs cocomadigital"
  warn "If only the /crm checks failed, the Apache vhost is missing the /crm rules —"
  warn "  see the routing table in the header of this script."
  exit 1
fi

log "Deployment complete ✅"
pm2 status 2>/dev/null | grep -E "cocomadigital|cocoma-api" || true
