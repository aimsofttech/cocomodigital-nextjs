// @ts-nocheck
/**
 * Tiny session-scoped cache for API responses.
 *
 * The marketing endpoints (Add-on Activities, Content Created)
 * have ~1-2s round-trip times. Without caching, every tab click
 * re-fetches the same payload, so flipping back to a tab you
 * already viewed feels just as slow the second time.
 *
 * This wraps an async fetcher with a sessionStorage cache:
 *   - First call hits the network; result is stored under `key`.
 *   - Repeat calls within the TTL return the cached payload
 *     synchronously (well, as a resolved promise) so the tab
 *     content shows instantly.
 *   - Cache lives in sessionStorage (per-tab), so it dies when
 *     the user closes the tab — no stale data across visits.
 *
 * Backend caching / N+1 fixes are a separate (Anshu) job; this
 * is purely a frontend perceived-speed win.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  payload: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

function readStore<T>(key: string): CacheEntry<T> | null {
  // Prefer the in-memory hit (cheaper, no JSON parse).
  if (memoryCache.has(key)) return memoryCache.get(key) as CacheEntry<T>;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeStore<T>(key: string, payload: CacheEntry<T>): void {
  memoryCache.set(key, payload);
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // sessionStorage can throw if quota is hit — that's fine,
    // we still have the in-memory copy for this session.
  }
}

/**
 * Fetch with cache. Returns a Promise resolving to the payload.
 *
 * @param key       Stable cache key (URL + params hash).
 * @param fetcher   Async function that produces the payload.
 * @param options
 * @param options.ttlMs  Override default TTL.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  { ttlMs = DEFAULT_TTL_MS }: { ttlMs?: number } = {}
): Promise<T> {
  const now = Date.now();
  const hit = readStore<T>(key);
  if (hit && hit.expiresAt > now) {
    return hit.payload;
  }
  const payload = await fetcher();
  writeStore(key, { payload, expiresAt: now + ttlMs });
  return payload;
}

/** Build a stable string key for an endpoint + params object. */
export function buildCacheKey(
  endpoint: string,
  params: Record<string, unknown> = {}
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `ccd:${endpoint}?${sortedParams}`;
}
