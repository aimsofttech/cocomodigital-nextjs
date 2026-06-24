/**
 * Typed HTTP client for the standalone content API
 * (cocoma-admin-api — Express + MongoDB).
 *
 * The web app was previously coupled to an in-process the CMS
 * reached via /content-api/*. This client is the single seam through
 * which all content now flows: server components and the data-access
 * helpers in src/lib/payload.ts call `apiGet` here, which hits the
 * Express api's public /api/* routes.
 *
 * Design notes:
 *  - Base URL comes from NEXT_PUBLIC_API_URL (no hardcoded host).
 *  - The Express api wraps every response in { status, data }.
 *    `apiGet` unwraps `data` and returns it (or null on any failure).
 *  - Failures never throw: a network error, non-2xx status, or
 *    non-JSON body all resolve to `null` so a single bad fetch
 *    degrades one section instead of crashing the whole route —
 *    matching the previous the API-fetch behaviour.
 *  - Caching uses Next.js native `revalidate` (default 5 min) so
 *    ISR / SSG / SSR behaviour is preserved exactly.
 */

/** Default cache lifetime for content fetches (seconds).
 *  0 = no caching → every request (and every page refresh) re-fetches
 *  fresh data from the API. Callers can still opt into caching by passing
 *  an explicit `revalidate` > 0. */
const DEFAULT_REVALIDATE = 0;

/** Resolved API base URL, trailing slash stripped. */
export const API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"
).replace(/\/+$/, "");

/**
 * During `next build` the external API may not be reachable, and
 * generateStaticParams / sitemap fetches would flood the build log
 * with connection errors. Detect the build phase and short-circuit
 * to empty data; runtime SSR/ISR fetches the real data normally.
 */
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

/**
 * The Express API and this Next.js app boot concurrently in dev
 * (`npm run dev` runs both). On a cold start the API isn't listening
 * on its port yet (it also connects to a remote MongoDB first), so the
 * homepage's first SSR fetches race ahead and fail with ECONNREFUSED —
 * flooding the console and rendering empty sections. Retry connection
 * failures a few times with a short backoff so the page recovers as
 * soon as the API is up, instead of bailing on the first refusal.
 */
const CONNECT_RETRY_ATTEMPTS = 4;
const CONNECT_RETRY_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** True when a thrown fetch error is a transient connection failure
 *  (server not accepting connections yet) rather than a real fault. */
const isConnectionError = (err: unknown): boolean => {
  const codes = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"];
  const seen = new Set<unknown>();
  const walk = (e: any): boolean => {
    if (!e || typeof e !== "object" || seen.has(e)) return false;
    seen.add(e);
    if (typeof e.code === "string" && codes.includes(e.code)) return true;
    if (Array.isArray(e.errors) && e.errors.some(walk)) return true;
    return walk(e.cause);
  };
  return walk(err);
};

/** The envelope every Express api endpoint returns. */
export interface ApiEnvelope<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface ApiGetOptions {
  /** Override the default revalidate window (seconds). 0 = no cache. */
  revalidate?: number;
  /** Query-string params; undefined/null entries are skipped. */
  searchParams?: Record<string, QueryValue>;
}

/** Join the base URL, a path, and optional query params into a URL. */
const buildUrl = (
  path: string,
  searchParams?: Record<string, QueryValue>,
): string => {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalisedPath}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
};

/**
 * GET a resource from the content API and return its unwrapped
 * `data` payload, or `null` on any failure (network, non-2xx,
 * non-JSON, or `status: "error"`).
 */
export async function apiGet<T>(
  path: string,
  opts: ApiGetOptions = {},
): Promise<T | null> {
  if (IS_BUILD) return null;

  const url = buildUrl(path, opts.searchParams);

  // revalidate 0 → opt out of the Next.js data cache entirely (no-store),
  // so the data is fresh on every request/refresh. >0 keeps ISR caching.
  const revalidate = opts.revalidate ?? DEFAULT_REVALIDATE;
  const fetchInit: RequestInit =
    revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" };

  let res: Response;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(url, fetchInit);
      break;
    } catch (err) {
      // Retry transient connection failures (API still booting) a few
      // times before giving up, so a cold-start race doesn't surface.
      if (isConnectionError(err) && attempt < CONNECT_RETRY_ATTEMPTS) {
        await sleep(CONNECT_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      console.error(`[api] GET ${path} network error:`, err);
      return null;
    }
  }

  if (!res.ok) {
    /* A 404 is an expected "resource doesn't exist" outcome for
       by-slug / by-id lookups (e.g. /service/group-service/<slug> for
       a slug with no service). Callers already handle the resulting
       null gracefully, so don't log it as an error — that would
       otherwise surface in the Next.js dev overlay as a Console Error
       for a perfectly normal not-found case. Real failures (5xx, etc.)
       are still logged. */
    if (res.status !== 404) {
      console.error(`[api] GET ${path} failed: ${res.status} ${res.statusText}`);
    }
    return null;
  }

  let body: ApiEnvelope<T>;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch (err) {
    console.error(`[api] GET ${path} JSON parse error:`, err);
    return null;
  }

  if (body.status === "error") {
    console.error(`[api] GET ${path} api error:`, body.message ?? "unknown");
    return null;
  }

  return body.data ?? null;
}
