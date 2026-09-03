/**
 * Caspian's API client.
 *
 * Every call goes to /admin/api/media with the shared admin token, which
 * is the same session the panel uses — an editor already signed into
 * /admin opens /caspian and is already in.
 *
 * There is no client-side governance here on purpose. What may be seen is
 * decided by the API, once, in buildGovernanceFilter; a second opinion in
 * the browser would be a second definition of "safe", and the browser's
 * copy is the one an attacker can edit. The UI's job is to render what it
 * is given and to hide controls the session cannot use — hiding a button
 * is a courtesy, not a control.
 */

import { ADMIN_API_BASE, readAdminToken } from "./adminSession";

export interface CaspianAsset {
  id: string;
  key: string;
  url: string;
  kind: "image" | "video";
  caption: string;
  altText: string;
  tags: string[];
  category: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  rights: "own" | "client-ip" | "stock" | "unknown";
  usable: boolean;
  reviewed: number;
  sensitive: boolean;
  people: number;
  namedPeople: number;
  describeStatus: "pending" | "processing" | "done" | "failed" | "skipped";
  createdAt: string;
  review?: { state: "proposed" | "approved" | "rejected" };
}

export interface SavedSearch {
  key: string;
  label: string;
  note: string;
  requiresJob: boolean;
  values: string[];
  count: number;
}

export interface Page<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

/** Thrown with the API's own message, which is written for a person. */
export class CaspianError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readAdminToken();
  const res = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  let body: { message?: string; data?: unknown } = {};
  try {
    body = await res.json();
  } catch {
    /* A proxy error page, or the API being down. Fall through to the
       status-based message below rather than showing "Unexpected token <". */
  }

  if (!res.ok) {
    /* 401 and 403 are different events and the API is careful to separate
       them: 401 means the session is gone, 403 means it is fine and this
       is not yours. Conflating them would sign a reviewer out mid-queue
       for touching one asset above their level. */
    const fallback =
      res.status === 401
        ? "Your session has expired. Sign in again."
        : res.status === 403
          ? "You do not have permission to do that."
          : `The library did not respond as expected (${res.status}).`;
    throw new CaspianError(res.status, body.message || fallback);
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) s.set(k, String(v));
  });
  const out = s.toString();
  return out ? `?${out}` : "";
};

export const listAssets = (params: {
  q?: string;
  search?: string;
  value?: string;
  rights?: string;
  kind?: string;
  reviewState?: string;
  publishable?: string;
  page?: number;
  limit?: number;
}) => call<Page<CaspianAsset>>(`/media${qs(params)}`);

export const listSearches = () =>
  call<{ data: SavedSearch[] }>("/media/searches").then((r) => r.data);

export const approveAsset = (id: string) =>
  call<{ message: string; data: CaspianAsset }>(`/media/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const rejectAsset = (id: string, reason: string) =>
  call<{ message: string }>(`/media/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
