/**
 * Compatibility shim for client-side data fetching.
 *
 * Several client components fetch from `/content-api/<collection>`
 * and expect a list envelope `{ docs, totalDocs, … }`. Rather than
 * rewrite ~40 components at once, this route re-exposes the
 * MongoDB-backed data layer (src/lib/content.ts → the Express API on
 * NEXT_PUBLIC_API_URL) in that shape, and proxies lead-form POSTs to
 * the Express API. No CMS or local database runs in this app.
 *
 * GET  /content-api/<collection>?where[..]=..&limit=&sort=
 * GET  /content-api/globals/<slug>
 * POST /content-api/<lead-collection>   → proxied to the Express API
 */
import { NextRequest, NextResponse } from "next/server";
import { findBySlug, findCollection, getGlobal } from "@/src/lib/content";

export const dynamic = "force-dynamic";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"
).replace(/\/+$/, "");

type WhereLeaf = Record<string, string>;
type WhereObj = Record<string, WhereLeaf>;

/** Rebuild the API's `where[field][op]=value` query params into an object. */
const parseWhere = (sp: URLSearchParams): WhereObj => {
  const where: WhereObj = {};
  for (const [key, value] of sp.entries()) {
    const m = key.match(/^where\[([^\]]+)\]\[([^\]]+)\]$/);
    if (m) {
      const field = m[1];
      const op = m[2];
      (where[field] ??= {})[op] = value;
    }
  }
  return where;
};

const emptyList = {
  docs: [] as unknown[],
  totalDocs: 0,
  totalPages: 0,
  page: 1,
  limit: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

interface Slugged {
  slug?: string;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
  const { slug } = await ctx.params;
  const seg = slug ?? [];
  const sp = req.nextUrl.searchParams;

  if (seg[0] === "globals") {
    const g = await getGlobal(seg[1] ?? "");
    return NextResponse.json(g ?? {});
  }

  // Booking slot availability — proxied to the Express API (not the content layer).
  if (seg[0] === "meeting-availability") {
    try {
      const res = await fetch(
        `${API_BASE}/contact/availability?${sp.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({ booked: [] }));
      return NextResponse.json(data, { status: res.status });
    } catch {
      // Fail open: if the API is unreachable, return no bookings so the UI still
      // shows slots (the server-side unique index still prevents double-booking).
      return NextResponse.json({ status: "error", booked: [] });
    }
  }

  const collection = seg[0];
  if (!collection) return NextResponse.json(emptyList);

  const where = parseWhere(sp);
  const limit = Number(sp.get("limit")) || 100;
  const page = Number(sp.get("page")) || undefined;
  const sort = sp.get("sort") ?? undefined;

  /* Single-doc lookup by slug. findBySlug uses the collection's detail
     endpoint when it has one (e.g. services → group-service, with the
     top banner), else matches the list on slug. */
  const slugEq = where.slug?.equals;
  if (slugEq) {
    const doc = await findBySlug<Slugged>(collection, slugEq, {});
    return NextResponse.json(
      doc
        ? { ...emptyList, docs: [doc], totalDocs: 1, totalPages: 1, limit }
        : emptyList,
    );
  }

  const hasWhere = Object.keys(where).length > 0;
  const result = await findCollection(collection, {
    where: hasWhere ? (where as Record<string, unknown>) : undefined,
    limit,
    page,
    sort,
  });
  return NextResponse.json(result);
}

/* Loopback / private / link-local / CGNAT — proxy hops, never the visitor. */
const isPrivateIp = (ip: string): boolean =>
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip) ||
  /^(::1?$|f[cd]|fe80)/i.test(ip);

const IP_SHAPE = /^[0-9a-f.:]{2,45}$/i;

/**
 * The visitor's public IP as seen by the proxies in front of this app.
 * The live site sits behind Cloudflare, so CF-Connecting-IP is the real
 * visitor there — X-Forwarded-For's right end would be a Cloudflare edge
 * server. Without Cloudflare (local, staging), X-Forwarded-For is read
 * right-to-left (the right end is what our own reverse proxy appended, so it
 * can't be forged by the client), skipping private proxy hops. The API
 * re-validates whatever this returns.
 */
const visitorIpOf = (req: NextRequest): string | null => {
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    ...(req.headers.get("x-forwarded-for") ?? "").split(",").reverse(),
  ];
  for (const raw of candidates) {
    const ip = (raw ?? "").trim().replace(/^::ffff:(?=\d+\.)/i, "");
    if (IP_SHAPE.test(ip) && !isPrivateIp(ip)) return ip;
  }
  return null;
};

/* Lead/form submissions → corresponding Express api endpoints. */
const POST_MAP: Record<string, string> = {
  "contact-leads": "/contact",
  "consultation-leads": "/contact/free-consultation",
  "hire-us-leads": "/contact",
  "job-applicants": "/job/applicants",
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
  const { slug } = await ctx.params;
  const collection = (slug ?? [])[0];
  const target = POST_MAP[collection];
  if (!target) {
    return NextResponse.json(
      { status: "error", message: `Unsupported collection: ${collection}` },
      { status: 404 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  const init: RequestInit = { method: "POST" };
  const headers: Record<string, string> = {};
  if (contentType.includes("application/json")) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(await req.json());
  } else {
    /* multipart/form-data (e.g. résumé upload) — forward as-is. */
    headers["content-type"] = contentType;
    init.body = Buffer.from(await req.arrayBuffer());
  }
  /* This server makes the upstream call, so without this the API would only
     ever see our own address. It uses the visitor's IP for an approximate
     city/country on meeting bookings. */
  const visitorIp = visitorIpOf(req);
  if (visitorIp) headers["x-visitor-ip"] = visitorIp;
  init.headers = headers;

  try {
    const res = await fetch(`${API_BASE}${target}`, init);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[content-api] POST ${collection} proxy error:`, err);
    return NextResponse.json(
      { status: "error", message: "Upstream request failed" },
      { status: 502 },
    );
  }
}
