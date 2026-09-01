"use client";

import { useEffect, useState } from "react";

/**
 * The demo sign-in used by /login, and the header's view of it.
 *
 * DELIBERATELY NOT REAL AUTHENTICATION. The credentials below are compared in
 * the browser, so anyone can read them in the page source. There is no API, no
 * token and no server-side session — signing in records a flag in this
 * browser's own storage and nothing on the site is gated behind it.
 *
 * It lives here rather than inside the login page because the header needs to
 * know about it too, and two copies of the same rule would eventually disagree.
 */

/** The demo credentials. Not secrets, and not treated as such. */
export const DEMO_EMAIL = "demo@gmail.com";
export const DEMO_PASSWORD = "demo";

const SESSION_KEY = "cocoma_demo_login";

/* Storage fires `storage` only in OTHER tabs, so a change made here has to
   announce itself. The header listens for both: this event for the current tab,
   and `storage` for every other one. */
const AUTH_EVENT = "cocoma-demo-auth";

const announce = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
};

/** The signed-in email, or null. Safe to call when storage is unavailable. */
export function readDemoSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Do these credentials match the demo account? */
export function checkDemoCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

export function signInDemo(email: string): void {
  try {
    window.localStorage.setItem(SESSION_KEY, email.trim().toLowerCase());
  } catch {
    /* Storage blocked (private mode). The current page view still updates. */
  }
  announce();
}

export function signOutDemo(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
  announce();
}

/**
 * The signed-in email, kept live.
 *
 * Starts as null so the server render and the first client render agree —
 * reading storage during render would produce a hydration mismatch. The real
 * value arrives in the effect a tick later.
 */
export function useDemoSession(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setEmail(readDemoSession());
    sync();
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return email;
}
