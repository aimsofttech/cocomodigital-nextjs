import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next 16 proxy (was `middleware.ts` + `export function middleware`
 * in earlier Next versions; renamed in Next 16 — same behavior, new
 * file name + new exported function name).
 *
 * Forward the request pathname as an `x-pathname` response header
 * so server components (specifically `src/app/layout.tsx`) can
 * branch on it.
 *
 * Why: Next 16 + the API-in-monorepo issue — the marketing root
 * layout renders <html><body><SiteShell>... and the API's
 * RootLayout under /admin renders ANOTHER <html>, producing the
 * "html cannot be a child of main" hydration error. The marketing
 * layout uses this header to detect /admin and /content-api
 * routes and skip its shell, letting the API provide the html
 * unilaterally.
 *
 * Long-term fix is to restructure all marketing routes under a
 * `(marketing)/` route group and delete the top-level layout —
 * planned for a Phase 4 cleanup.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

/* Run on every request except static assets and Next internals.
   Keep the matcher conservative — proxy runs on every page render,
   so any wasted invocation adds latency. */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|.*\\..*).*)"],
};
