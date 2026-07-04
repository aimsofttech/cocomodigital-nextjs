/**
 * /api/marketing-recommendations — Related case studies for the
 * "Other launches we've run" rail on /marketing/[slug].
 *
 * Why a dedicated route instead of letting the client hit the
 * generic /content-api/marketing-house-items endpoint:
 *
 *   - Items in thin categories (Reality Show with 1 doc, Live Match
 *     with 2) returned 0-1 cards. The client had no way to top up
 *     from sibling categories without N round trips.
 *   - We need a stable shape ({id, slug, title, poster_image,
 *     category_id}) — flatten Media doc → URL once, server-side.
 *   - Serve fresh data on every request (no route-level cache) so
 *     admin edits to marketing items appear immediately.
 *
 * Strategy:
 *   1. Look up the parent doc by slug.
 *   2. Pull up to `limit` sibling docs in the same category,
 *      excluding the parent, sorted by `order`.
 *   3. If short, top up with featured items from any category
 *      (also sorted by order). Excludes parent + already-picked.
 *   4. Map to a stable adapter shape.
 *
 * Usage:
 *   GET /api/marketing-recommendations?slug=teri-baton-mein-uljah-jiya&limit=6
 *   → { docs: [{ id, slug, title, poster_image, category_id }, …] }
 */
import { NextRequest, NextResponse } from "next/server";
import { getMarketingHouseItem, getMarketingHouseItems, imageUrl } from "@/src/lib/content";

export const dynamic = "force-dynamic";

interface RecommendationDoc {
  id: number | string;
  slug?: string;
  title?: string;
  poster_image?: string;
  category_id?: number | string | null;
}

const adapt = (doc: any): RecommendationDoc => ({
  id: doc.id,
  slug: doc.slug,
  title: doc.title,
  poster_image: imageUrl(doc, "poster_image") || imageUrl(doc) || "",
  category_id: typeof doc.category === "object" ? doc.category?.id : doc.category,
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "6", 10) || 6, 1),
    24,
  );

  if (!slug) {
    return NextResponse.json(
      { docs: [], error: "slug query param is required" },
      { status: 400 },
    );
  }

  const parent: any = await getMarketingHouseItem(slug, { depth: 0 }).catch(
    () => null,
  );
  if (!parent) {
    return NextResponse.json(
      { docs: [], error: "parent not found" },
      { status: 404 },
    );
  }

  const parentCategoryId =
    typeof parent.category === "object" ? parent.category?.id : parent.category;
  const parentId = parent.id;
  const seen = new Set<string | number>([parentId]);

  /* Tier 1 — same category. Pull a generous window so we have
     enough non-self matches even when `order` puts the parent
     somewhere in the middle. depth=1 so the Media doc on
     poster_image expands and imageUrl() can resolve it. */
  const tier1: any = parentCategoryId
    ? await getMarketingHouseItems({
        where: { category: { equals: parentCategoryId } },
        limit: limit + 4,
        depth: 1,
        sort: "order",
      }).catch(() => ({ docs: [] }))
    : { docs: [] };

  const picks: RecommendationDoc[] = [];
  for (const doc of tier1.docs || []) {
    if (picks.length >= limit) break;
    if (seen.has(doc.id)) continue;
    picks.push(adapt(doc));
    seen.add(doc.id);
  }

  /* Tier 2 — top up from `featured` items in any category. Many
     items don't have a featured flag, so we fall back to plain
     `order` if the tier comes up short. */
  if (picks.length < limit) {
    const tier2: any = await getMarketingHouseItems({
      where: { featured: { equals: true } },
      limit: limit + 6,
      depth: 1,
      sort: "order",
    }).catch(() => ({ docs: [] }));
    for (const doc of tier2.docs || []) {
      if (picks.length >= limit) break;
      if (seen.has(doc.id)) continue;
      picks.push(adapt(doc));
      seen.add(doc.id);
    }
  }

  /* Tier 3 — last-resort top up from the whole collection. Even a
     brand new item with no category and zero featured siblings
     still shows a full rail. */
  if (picks.length < limit) {
    const tier3: any = await getMarketingHouseItems({
      limit: limit + 12,
      depth: 1,
      sort: "order",
    }).catch(() => ({ docs: [] }));
    for (const doc of tier3.docs || []) {
      if (picks.length >= limit) break;
      if (seen.has(doc.id)) continue;
      picks.push(adapt(doc));
      seen.add(doc.id);
    }
  }

  return NextResponse.json(
    {
      docs: picks,
      meta: {
        parentId,
        parentCategoryId,
        tiers: {
          sameCategory: Math.min(limit, tier1.docs?.length || 0),
          requested: limit,
          returned: picks.length,
        },
      },
    },
    {
      headers: {
        /* Lightweight HTTP cache too — the route itself is RSC-
           revalidated at the `revalidate` constant above, but a
           CDN/edge can still cache the JSON. */
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    },
  );
}
