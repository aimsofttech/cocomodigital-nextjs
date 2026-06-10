// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { FaArrowRight } from "react-icons/fa";
/**
 * <StoryRelatedStories /> — "Keep reading" rail at the bottom of
 * a client success story page.
 *
 * Mirrors the BlogRelatedArticles pattern. Same sticker card
 * shape so users feel anchored back to the
 * /success-story-view-all index after finishing a case study.
 *
 * Data source — pulled from Home() (`/home`) instead of the
 * dedicated success-stories list endpoint
 * (`/success_stories_view_all`). Reason: the dedicated list
 * endpoint doesn't currently return `slug` on each item (only
 * id, client_title, client_img, …) — so cards can't link to
 * their detail pages. The home endpoint DOES include slug on
 * each client (verified empirically). Once Satyam adds slug to
 * the dedicated list response we can switch back; until then
 * we piggyback on the home payload, which is already cached
 * via apiService's request cache when the user has visited
 * home first.
 */
const StoryRelatedStories = ({ currentStory }) => {
  const language = "en"; /* Phase 5b: lang slice dropped */
  const [items, setItems] = useState([]);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const currentId = currentStory?.id;

    const fetchList = async () => {
      try {
        /* Phase 5l: fetch related stories from the API
           success-stories, exclude the current one, take top 3
           by order. Shape the docs into the legacy
           {id, slug, client_title, client_img} cards expect. */
        const url = new URL("/content-api/success-stories", window.location.origin);
        url.searchParams.set("limit", "6");
        url.searchParams.set("sort", "order");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const list = (body?.docs || []).map((s: any) => ({
          id: s.id,
          slug: s.slug,
          client_title: s.title,
          client_img:
            (typeof s.image === "object" && s.image?.url) || s.legacyImageUrl,
        }));

        const filtered = list
          .filter((s: any) => s?.id && s.id !== currentId && s?.slug)
          .slice(0, 3);

        if (!cancelled) setItems(filtered);
      } catch (err) {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setResolved(true);
      }
    };

    fetchList();
    return () => {
      cancelled = true;
    };
  }, [currentStory, language]);

  if (!resolved) return null;
  if (!items.length) return null;

  return (
    <section
      className="client-story-related"
      aria-labelledby="client-story-related-heading"
    >
      <header className="client-story-related-header">
        <p className="client-story-related-eyebrow">Keep reading</p>
        <h2
          id="client-story-related-heading"
          className="client-story-related-heading font-primary"
        >
          More success stories
        </h2>
      </header>

      <div className="client-story-related-grid">
        {items.map((s) => {
          const title =
            s?.client_title ||
            s?.title ||
            "Untitled success story";
          const image =
            s?.client_img ||
            s?.image ||
            "/Images/movieimg.svg";
          const blurb =
            s?.client_description ||
            s?.short_description ||
            null;
          return (
            <Link
              key={s.id}
              to={`/case-studies/${s.slug}`}
              className="client-story-related-card"
            >
              <div className="client-story-related-image-wrapper">
                <Image
                  className="client-story-related-image"
                  src={image}
                  alt={title}
                  width={600}
                  height={400}
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
              <div className="client-story-related-body">
                <p className="client-story-related-eyebrow-small">
                  Success Story
                </p>
                <h3 className="client-story-related-title font-primary">
                  {title}
                </h3>
                {blurb && (
                  <p className="client-story-related-blurb">{blurb}</p>
                )}
                <span className="client-story-related-cta">
                  Read story
                  <FaArrowRight aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="client-story-related-footer">
        <Link
          to="/case-studies"
          className="client-story-related-all"
        >
          See all stories
          <FaArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default StoryRelatedStories;
