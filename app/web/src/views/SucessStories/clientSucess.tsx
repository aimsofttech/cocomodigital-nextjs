// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "@/src/lib/navigation";
import StoryHeroBody from "../../components/SuccessStoryDetails/StoryHeroBody";
import StoryRelatedStories from "../../components/SuccessStoryDetails/StoryRelatedStories";
import BlogAuthorCard from "../../components/BlogDetails/BlogAuthorCard/BlogAuthorCard";
import BlogRelatedServices from "../../components/BlogDetails/BlogRelatedServices/BlogRelatedServices";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";

/**
 * /client-success-stories/:slug — sticker-language case-study page.
 *
 * Rebuilt from the previous bare structure (single
 * <ClientDescription /> wrapper + book-call section) into the
 * same shape as /blog, with extra service emphasis tuned
 * for case studies:
 *
 *   1. Reading-progress bar (sticky top of viewport while the
 *      article is in view — same pattern as blog + JD pages)
 *   2. <StoryHeroBody/> — back link, eyebrow, optional service
 *      chip strip, title, sticker-framed cover image, optional
 *      outcomes tile row, then the admin HTML body with token
 *      typography
 *   3. <BlogRelatedServices/> — services Cocoma offers, with
 *      service-heavy framing as the bridge between "what we did
 *      for them" and "what we can do for you"
 *   4. <BlogAuthorCard/> — sticker bio + personal "Talk to Anil"
 *      CTA. Carries the closing conversion energy
 *   5. <StoryRelatedStories/> — "More success stories" rail to
 *      keep readers on the site
 *   6. <FloatingCallChip/> — sticky bottom-right book-call
 *      affordance throughout
 *
 * Reusing the BlogDetails BlogAuthorCard + BlogRelatedServices
 * components — they're context-agnostic enough (author by id,
 * priority services from API). Only StoryHeroBody and
 * StoryRelatedStories are new.
 */
const ClientPage = () => {
  const [clientData, setClientData] = useState();
  const [error, setError] = useState(null);
  const { slug } = useParams();

  // Reading-progress state — sticky thin yellow bar at top of
  // viewport while the user is mid-article. Same pattern as
  // /blog + /job-details.
  const articleRef = useRef(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showReadingProgress, setShowReadingProgress] = useState(false);

  useEffect(() => {
    // Reset stale data immediately on slug change so navigating
    // /client-success-stories/A → /client-success-stories/B
    // doesn't briefly render A's content while B's fetch is in
    // flight. Same flicker-fix pattern as the blog-details +
    // job-details + service-details pages.
    setClientData(undefined);

    const fetchSuccessStoryDetails = async () => {
      try {
        /* Phase 5l: fetch from the API success-stories by slug. */
        const url = new URL("/content-api/success-stories", window.location.origin);
        url.searchParams.set("where[slug][equals]", slug);
        url.searchParams.set("limit", "1");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        /* Phase 5+ fix 2026-05-22: flatten the `image` field from
           the Media-doc object the API returns at depth=1 down to a
           plain URL string. StoryHeroBody (and BlogAuthorCard,
           etc.) render `<img src={data.image}>` directly — passing
           the object stringifies to "[object Object]" and 404s.
           Fall back to `legacyImageUrl` for any docs not yet
           linked to a Media doc via 08-link-images. Same for
           description-style fields we may add in future. */
        const raw = body?.docs?.[0] ?? null;
        if (raw) {
          const flattened = { ...raw };
          flattened.image =
            (typeof raw.image === "object" && raw.image?.url) ||
            raw.legacyImageUrl ||
            "";
          flattened.thumbnail =
            (typeof raw.thumbnail === "object" && raw.thumbnail?.url) ||
            raw.legacyThumbnailUrl ||
            flattened.image;
          setClientData(flattened);
        } else {
          setClientData(null);
        }
      } catch (err) {
        setError("Error fetching data");
      }
    };
    if (slug) fetchSuccessStoryDetails();
  }, [slug]);

  // Reading-progress effect — measures the article section's
  // position on every scroll. Bar visible only while the section
  // overlaps the viewport; width = % of section the user has
  // scrolled past. Re-runs when data lands so the section's
  // height becomes measurable.
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) {
        setShowReadingProgress(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      const inView = rect.top < vh && rect.bottom > 0;
      setShowReadingProgress(inView);
      if (!inView) return;

      const sectionHeight = rect.height;
      const denom = Math.max(1, sectionHeight - vh);
      const scrolledIn = Math.max(0, -rect.top);
      const pct = Math.max(0, Math.min(100, (scrolledIn / denom) * 100));
      setReadingProgress(pct);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [clientData]);

  if (error) {
    return (
      <div className="client-story-error">
        <h1>{error}</h1>
        <p>We couldn't find the story you're looking for.</p>
        <Link to="/case-studies" className="client-story-error-link">
          See all case studies
        </Link>
      </div>
    );
  }

  // Author id read defensively — admin schema isn't strictly
  // typed on the frontend. Fallback handled inside BlogAuthorCard.
  const authorId =
    clientData?.author_id ?? clientData?.author?.id ?? null;

  return (
    <>
      <div className="client-story-page-wrapper">
        <article
          ref={articleRef}
          className="client-story-article-section"
        >
          <StoryHeroBody data={clientData} />
        </article>

        {/* Closing rails — only mount once data has landed. Order
            is intentional for case studies: services rail first
            (the "what we offer / similar to what we did for this
            client" bridge) → author card (personal closer) →
            related stories (keep reading). Each section degrades
            silently if its data isn't available. */}
        {clientData && (
          <>
            <section className="client-story-services-section">
              <BlogRelatedServices />
            </section>

            <section className="client-story-author-section">
              <BlogAuthorCard authorId={authorId} />
            </section>

            <section className="client-story-related-section">
              <StoryRelatedStories currentStory={clientData} />
            </section>
          </>
        )}
      </div>

      {/* Reading progress — fixed thin yellow bar at the top of
          the viewport. Mounts only while the article is in view. */}
      {showReadingProgress && (
        <div className="client-story-reading-progress" aria-hidden="true">
          <div
            className="client-story-reading-progress-fill"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      {/* Sticky bottom-right "Talk to Anil" chip — same component
          used on /blog, /SingleVideo, /Service,
          /SingleService. Provides an always-available CTA without
          competing with the in-flow author card (which is
          centered, in-content). */}
      <FloatingCallChip />
    </>
  );
};

export default ClientPage;
