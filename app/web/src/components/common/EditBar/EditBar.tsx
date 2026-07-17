"use client";

/**
 * EditBar — the "edit this page from the front-end" affordance.
 *
 * Phase 16 2026-06-01. A single self-contained component, mounted
 * ONCE in SiteShell, that appears on every public detail page as a
 * small floating pill in the bottom-right — but ONLY when the
 * visitor is a logged-in Cocoma editor.
 *
 * How it works (all client-side, so public pages stay cacheable):
 *  1. Read the current pathname, match it against PATH_MAP to learn
 *     which collection this page renders (e.g. /blog/my-post →
 *     blog-posts) + the slug.
 *  2. Validate the viewer against the API's /users/me (reads the
 *     httpOnly payload-token cookie). Anonymous → render nothing.
 *  3. Look up the doc id by slug.
 *  4. Render a pill deep-linking to the exact editor:
 *       "Edit in Studio" → /studio/<route>/<id>/edit   (friendly)
 *       "Open in Admin"  → /admin/collections/<collection>/<id>
 *
 * Adding a new editable page type = one row in PATH_MAP. No
 * per-page wiring, no server-side cookie reads, zero overhead for
 * anonymous visitors (the /me + slug-lookup fetches only fire once
 * a path matches, and bail immediately if not logged in).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface RouteMap {
  /** URL prefix incl. trailing slash, e.g. "/blog/". */
  prefix: string;
  /** the API collection slug. */
  collection: string;
  /** Studio route segment, or null for admin-only collections. */
  studioRoute: string | null;
  /** Human label → "Edit this <label>". */
  label: string;
}

/* Order matters only for non-overlapping prefixes; these are all
   distinct. Add a row here to make a new page type editable. */
const PATH_MAP: RouteMap[] = [
  { prefix: "/blog/", collection: "blog-posts", studioRoute: "blog", label: "blog post" },
  { prefix: "/solutions/", collection: "solutions-pages", studioRoute: null, label: "solution page" },
  { prefix: "/services/", collection: "services", studioRoute: "services", label: "service" },
  { prefix: "/service/", collection: "services", studioRoute: "services", label: "service" },
  { prefix: "/marketing/", collection: "marketing-house-items", studioRoute: "marketing", label: "marketing item" },
  { prefix: "/case-studies/", collection: "success-stories", studioRoute: "case-studies", label: "case study" },
  { prefix: "/campaigns/", collection: "campaigns", studioRoute: "campaigns", label: "campaign" },
  { prefix: "/social/", collection: "social-posts", studioRoute: "social", label: "social post" },
  { prefix: "/ai/", collection: "ai-showcases", studioRoute: "ai", label: "AI showcase" },
  { prefix: "/creative-house/", collection: "creative-house-items", studioRoute: "creative", label: "creative item" },
];

interface MeUser {
  id: number | string;
  firstName?: string;
  name?: string;
  email?: string;
}

/** Match a pathname → { route, slug } or null. Requires a non-empty
 *  single slug segment after the prefix (so list/index pages, which
 *  have no slug, never match). */
function matchRoute(
  pathname: string,
): { route: RouteMap; slug: string } | null {
  for (const route of PATH_MAP) {
    if (!pathname.startsWith(route.prefix)) continue;
    const rest = pathname.slice(route.prefix.length);
    if (!rest || rest.includes("/")) continue; // index page or nested
    return { route, slug: decodeURIComponent(rest) };
  }
  return null;
}

export default function EditBar() {
  const pathname = usePathname() || "";
  const [user, setUser] = useState<MeUser | null>(null);
  const [docId, setDocId] = useState<number | string | null>(null);
  const [open, setOpen] = useState(true);

  const matched = matchRoute(pathname);

  /* Reset visibility whenever the path changes (client nav). */
  useEffect(() => {
    setOpen(true);
    setDocId(null);
  }, [pathname]);

  /* 1. Am I a logged-in editor? Only ask when on a matchable page. */
  useEffect(() => {
    if (!matched) {
      setUser(null);
      return;
    }
    let cancelled = false;
    fetch("/content-api/users/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled && body?.user?.id) setUser(body.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* 2. Once confirmed editor, resolve this slug → doc id. */
  useEffect(() => {
    if (!matched || !user) return;
    let cancelled = false;
    const { route, slug } = matched;
    const url = `/content-api/${route.collection}?where[slug][equals]=${encodeURIComponent(
      slug,
    )}&limit=1&depth=0&draft=true`;
    fetch(url, { credentials: "include", headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return;
        const id = body?.docs?.[0]?.id;
        if (id != null) setDocId(id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user]);

  if (!matched || !user || !open || docId == null) return null;

  const { route } = matched;
  const label = route.label;
  /* Phase 17: ONE edit destination per content type — the friendly
     Studio editor where it exists, the API admin for admin-only
     types (solutions). Kills the old "Studio or Admin?" double-
     button confusion: every page has exactly one place to edit. */
  const editUrl = route.studioRoute
    ? `/studio/${route.studioRoute}/${docId}/edit`
    : `/admin/collections/${route.collection}/${docId}`;
  const who = user.firstName || user.name || user.email || "editor";

  return (
    <div
      role="region"
      aria-label="Editor toolbar"
      style={{
        position: "fixed",
        bottom: 18,
        right: 18,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        maxWidth: "min(320px, calc(100vw - 36px))",
        padding: "12px 14px",
        borderRadius: 12,
        background: "#FFF000",
        border: "2px solid #111",
        boxShadow: "4px 4px 0 #111",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        color: "#111",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700 }}>
          ✏️ Edit this {label}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide editor toolbar"
          title="Hide until next page load"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            color: "#111",
            opacity: 0.6,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Studio/Admin live outside this Next app — no prefetch, and the
          click falls through to a full page load exactly like before */}
      <Link
        href={editUrl}
        prefetch={false}
        style={{
          display: "block",
          textAlign: "center",
          padding: "9px 12px",
          borderRadius: 8,
          background: "#111",
          color: "#FFF000",
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Open the editor →
      </Link>

      <span style={{ fontSize: 10, opacity: 0.7 }}>
        Signed in as {who} · only editors see this
      </span>
    </div>
  );
}
