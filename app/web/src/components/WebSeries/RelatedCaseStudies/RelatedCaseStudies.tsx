// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { GoArrowUpRight } from "react-icons/go";
// Category id → readable label. Mirrors /marketing_filter_data response so
// each card can show a "Film", "Web Series", "Music"… chip without an extra
// API call. If the admin adds new categories Anshu can extend this map.
const CATEGORY_LABELS = {
  20: "Film",
  21: "Web Series",
  22: "TV Show",
  24: "Podcast",
  26: "Live Match",
  27: "Music",
  29: "Auto",
  30: "Reality Show",
  32: "YouTube",
};

/**
 * Related case studies block — replaces the generic "Trusted by
 * brands" marquee on case study pages with industry-relevant peers.
 * Pulls from /marketing_home_priority filtered by the current case
 * study's category_id, excludes the current item, picks 3.
 *
 * Props:
 *   categoryId  — current case study's category_id
 *   excludeId   — current case study's id (so it doesn't link to itself)
 *   heading     — optional override copy
 */
const slugToTitle = (slug = "") =>
  slug
    .replace(/-+/g, " ")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bs(\d+)\b/i, "Season $1")
    .replace(/\b(youtube|marketing|campaign|web|series)\b/gi, (m) =>
      m.toLowerCase()
    )
    .replace(/^\w/, (c) => c.toUpperCase())
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const RelatedCaseStudies = ({
  /* Phase 5+ 2026-05-23: `slug` drives the dedicated
     /api/marketing-recommendations route. Thin categories (Reality
     Show: 1 doc; Live Match: 2) used to render 0-1 cards because
     same-category alone wasn't enough. The new route tops up from
     `featured` items + a global fallback so the rail is never
     empty. `categoryId` + `excludeId` are kept for legacy callers
     that don't have a slug. */
  slug,
  categoryId,
  excludeId,
  heading = "Other launches we've run",
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug && !categoryId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchRelated = async () => {
      try {
        let list: any[] = [];
        if (slug) {
          const url = new URL("/api/marketing-recommendations", window.location.origin);
          url.searchParams.set("slug", String(slug));
          url.searchParams.set("limit", "6");
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const body = await res.json();
          list = body?.docs || [];
        } else {
          /* Legacy path: same-category lookup against the generic
             the API endpoint. Kept so non-detail-page callers (any
             tile or rail elsewhere) still work without a refactor. */
          const url = new URL("/content-api/marketing-house-items", window.location.origin);
          url.searchParams.set("where[category][equals]", String(categoryId));
          url.searchParams.set("limit", "12");
          url.searchParams.set("sort", "order");
          url.searchParams.set("depth", "1");
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const body = await res.json();
          list = (body?.docs || [])
            .filter((it: any) => it?.id && it.id !== excludeId)
            .slice(0, 6);
        }
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRelated();
    return () => {
      cancelled = true;
    };
  }, [slug, categoryId, excludeId]);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <section className="related-cs-wrapper">
      <div className="related-cs-inner">
        <header className="related-cs-header">
          <span className="related-cs-eyebrow">More work</span>
          <h2 className="related-cs-heading">{heading}</h2>
        </header>

        <div className="related-cs-grid">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/marketing/${item.slug}`}
              className="related-cs-card"
            >
              <div className="related-cs-poster-wrap">
                {item.poster_image && (
                  <Image
                    className="related-cs-poster"
                    src={item.poster_image}
                    alt={slugToTitle(item.slug)}
                    width={600}
                    height={400}
                    style={{ width: "100%", height: "auto" }}
                  />
                )}
                <span className="related-cs-poster-overlay" aria-hidden="true" />
                {CATEGORY_LABELS[item.category_id] && (
                  <span className="related-cs-card-tag">
                    {CATEGORY_LABELS[item.category_id]}
                  </span>
                )}
              </div>
              <div className="related-cs-card-body">
                <h3 className="related-cs-card-title">
                  {slugToTitle(item.slug)}
                </h3>
                <span className="related-cs-card-cta">
                  View case study <GoArrowUpRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedCaseStudies;
