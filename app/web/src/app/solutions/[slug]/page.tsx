import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata, getStaticSeo, truncate } from "@/src/lib/seo";
import { getSolutionsPage } from "@/src/lib/content";
import ProspectPage from "@/src/views/Solutions/_shared/ProspectPage";
import { apiToProspectData } from "@/src/views/Solutions/_shared/apiToProspectData";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Render on demand, NOT statically generated.
 *
 * Phase 14 fix 2026-06-01: /solutions/[slug] was the ONLY detail
 * route with generateStaticParams, which marked it `● (SSG)` in the
 * build. The shared <ProspectPage> client component calls
 * useLocation()/usePathname(), which is request-context — that
 * collides with static generation and throws `DYNAMIC_SERVER_USAGE`
 * at runtime in a production build, surfacing as a raw 500.
 *
 * Symptom that hid it: dev mode (`next dev`) never static-generates,
 * so the page rendered fine locally; only a production build
 * (`next build && next start` — i.e. Coolify) tripped the conflict.
 *
 * Every sibling detail route (/blog/[slug], /marketing/[slug],
 * /campaigns/[slug], /social/[slug], /ai/[slug]) is `ƒ Dynamic`.
 * Aligning solutions to the same model fixes the 500 AND means
 * editor changes in /admin show up immediately (no rebuild needed).
 */
export const dynamic = "force-dynamic";

/**
 * /solutions/[slug] — generic Solutions page.
 *
 * Phase 8a 2026-05-25: replaces 10 per-slug app routes
 * (/solutions/youtube-creators, /solutions/ott-platforms, …) that
 * each imported a hand-coded React view + a the API-doc override.
 *
 * The single source of truth is now the `solutions-pages` the API
 * collection. Adding a new solution = creating a doc in /admin
 * (or Studio) — no code change. Deleting = `is_active: false` or
 * deleting the doc. The 6 deferred solutions (Crypto, etc) can
 * sit dormant with is_active: false until the narrative is ready.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const staticSeo = getStaticSeo(`/solutions/${slug}`);
  try {
    const doc = await getSolutionsPage(slug);
    return buildMetadata({
      ...staticSeo,
      title: doc?.meta_title || staticSeo.title,
      description: doc?.meta_description
        ? truncate(doc.meta_description, 160)
        : staticSeo.description,
      path: `/solutions/${slug}`,
      category: "Solutions",
    });
  } catch {
    return buildMetadata({ ...staticSeo, path: `/solutions/${slug}`, category: "Solutions" });
  }
}

export default async function SolutionsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let doc: any;
  try {
    doc = await getSolutionsPage(slug);
  } catch (err) {
    console.error(`[/solutions/${slug}] doc fetch failed:`, err);
    notFound();
  }
  /* 404 when the slug doesn't exist OR the editor flipped
     is_active off. Editors can also un-publish via _status=draft
     to take the page down without flipping a flag. */
  if (!doc || doc.is_active === false) notFound();

  /* Defensive: if the adapter or ProspectPage throws (e.g. malformed
     doc shape that escaped our guards), serve a clean 404 + log to
     server stdout (visible in Coolify logs) instead of a raw 500.
     Anshu's defensive fixes in `mergeApiOverrides`/Hero/Closer
     reduced the surface area; this catches anything still leaking. */
  try {
    const data = apiToProspectData(doc);
    return <ProspectPage data={data} />;
  } catch (err) {
    console.error(
      `[/solutions/${slug}] render failed for doc.id=${doc?.id}:`,
      err,
    );
    notFound();
  }
}
