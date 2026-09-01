"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "./apiClient";

/**
 * The signed-in admin, as seen from the public site.
 *
 * There is no separate account system here. This reads the very same session
 * the admin panel issues — the `cocoma_token` JWT in localStorage — and asks
 * the existing `/admin/api/profile` endpoint who it belongs to and what their
 * role may do. No new API, no second source of truth for permissions.
 *
 * Because the panel is served from this host under /admin, an editor who is
 * already signed in there is recognised here automatically; nothing extra to
 * log into. Where the two run on different origins (local development, with
 * the panel on its own Vite port) the site's own /login stores the same token
 * against this origin, so the flow is identical.
 *
 * WHAT THIS IS FOR: deciding whether to draw an Edit affordance. It is not a
 * security boundary and is not treated as one — every admin request is checked
 * again by middleware/adminAccess.js on the server, so a forged permission map
 * in the browser buys nothing but a pencil icon that leads to a 403.
 */

/** Same key the admin panel writes, so a session is shared, not duplicated. */
export const ADMIN_TOKEN_KEY = "cocoma_token";

/** Fires when this tab signs in or out, so the header/icons update at once. */
const ADMIN_AUTH_EVENT = "cocoma-admin-auth";

/**
 * Where the admin panel lives.
 *
 * "/admin" is correct in production — the panel is served from this same host,
 * which is also why an editor signed into it is recognised here without a
 * second login. No environment variable needs setting for that to work.
 *
 * Set NEXT_PUBLIC_ADMIN_URL only in local development, where the panel runs on
 * its own Vite port:
 *   NEXT_PUBLIC_ADMIN_URL=http://localhost:5173/admin npm run dev
 * It is documented here rather than in .env.example so no environment file has
 * to be touched to build or run this.
 */
export const ADMIN_BASE_URL = (
  process.env.NEXT_PUBLIC_ADMIN_URL || "/admin"
).replace(/\/+$/, "");

/** The admin API root, derived from the content API base (…/api → …). */
const ADMIN_API_BASE = `${API_BASE_URL.replace(/\/api$/, "")}/admin/api`;

export type AdminAction = "view" | "create" | "update" | "delete" | "export" | "import";
export type AdminPermissions = Record<string, Partial<Record<AdminAction, boolean>>>;

export interface AdminSession {
  name: string;
  email: string;
  roleName: string;
  isSuperAdmin: boolean;
  permissions: AdminPermissions;
}

export const readAdminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const storeAdminToken = (token: string) => {
  try {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    /* Storage blocked — the current page view still works. */
  }
  announceAdminAuth();
};

export const clearAdminToken = () => {
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
  announceAdminAuth();
};

export function announceAdminAuth() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_AUTH_EVENT));
}

/** Sign in against the panel's own endpoint. Returns null on bad credentials. */
export async function adminLogin(
  email: string,
  password: string,
): Promise<{ token: string; name: string } | null> {
  const res = await fetch(`${ADMIN_API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const token = body?.data?.token;
  if (!token) return null;
  return { token, name: body?.data?.user?.name || "" };
}

/** Resolve the stored token to a session, or null if it is absent or stale. */
async function fetchSession(token: string): Promise<AdminSession | null> {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    const user = body?.data?.user;
    if (!user) return null;
    return {
      name: user.name || "",
      email: user.email || "",
      roleName: user.roleName || "",
      isSuperAdmin: Boolean(user.isSuperAdmin),
      permissions: body?.data?.permissions || {},
    };
  } catch {
    /* API unreachable — behave exactly as "not signed in": no Edit icons. */
    return null;
  }
}

export interface AdminSessionState {
  session: AdminSession | null;
  /** True until the first check finishes, so nothing flashes on screen. */
  loading: boolean;
  /** May this user perform `action` on `moduleKey`? */
  can: (moduleKey: string, action: AdminAction) => boolean;
}

/* ── One session, shared by every subscriber ───────────────────────────────
 *
 * A page can hold dozens of Edit affordances, and each one asks whether it
 * should be drawn. If every one of them ran its own request the page would open
 * with a burst of identical calls to /admin/api/profile — enough on this page to
 * trip the API's rate limiter and leave most of the pencils never resolving.
 *
 * So the lookup lives here, at module scope: the first subscriber starts it,
 * everyone else waits on the same promise, and the answer is cached until the
 * session changes. One request per page, however many pencils are on it. */
type Listener = (state: { session: AdminSession | null; loading: boolean }) => void;

let cachedSession: AdminSession | null = null;
let cachedToken: string | null = null;
let resolved = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<Listener>();

const publish = () => {
  const state = { session: cachedSession, loading: !resolved };
  listeners.forEach((fn) => fn(state));
};

const load = (force = false): Promise<void> => {
  const token = readAdminToken();

  // Same token, already answered — nothing to do.
  if (!force && resolved && token === cachedToken) return Promise.resolve();
  if (inFlight && !force) return inFlight;

  cachedToken = token;
  if (!token) {
    cachedSession = null;
    resolved = true;
    publish();
    return Promise.resolve();
  }

  inFlight = fetchSession(token).then((next) => {
    cachedSession = next;
    resolved = true;
    inFlight = null;
    publish();
  });
  return inFlight;
};

/** Throw the cache away and look again — used when a session changes. */
const invalidate = () => {
  resolved = false;
  inFlight = null;
  cachedSession = null;
  publish();
  load(true);
};

if (typeof window !== "undefined") {
  window.addEventListener(ADMIN_AUTH_EVENT, invalidate);
  window.addEventListener("storage", invalidate); // another tab signed in or out
}

/**
 * The current admin session.
 *
 * Starts as null so the server render and the first client render agree; the
 * real answer arrives once the single shared lookup resolves.
 */
export function useAdminSession(): AdminSessionState {
  const [state, setState] = useState<{ session: AdminSession | null; loading: boolean }>(
    () => ({ session: null, loading: true }),
  );

  useEffect(() => {
    const listener: Listener = (next) => setState(next);
    listeners.add(listener);
    // Adopt whatever is already known, then make sure a lookup has happened.
    if (resolved) listener({ session: cachedSession, loading: false });
    load();
    return () => { listeners.delete(listener); };
  }, []);

  const can = (moduleKey: string, action: AdminAction) => {
    const { session } = state;
    if (!session) return false;
    if (session.isSuperAdmin) return true;
    return Boolean(session.permissions[moduleKey]?.[action]);
  };

  return { session: state.session, loading: state.loading, can };
}
