// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import BlogDetailsContent from "../../components/BlogDetails/BlogDetailsContent";
import BlogAuthorCard from "../../components/BlogDetails/BlogAuthorCard/BlogAuthorCard";
import BlogRelatedServices from "../../components/BlogDetails/BlogRelatedServices/BlogRelatedServices";
import BlogRelatedArticles from "../../components/BlogDetails/BlogRelatedArticles/BlogRelatedArticles";
import FloatingCallChip from "../../components/SingleVideo/FloatingCallChip/FloatingCallChip";
/* Markdown blog manifest — used for the markdown-in-repo posts.
   Lookup by slug short-circuits the Laravel API call when the
   slug matches a markdown post. */
import blogManifest from "../../content/blog.generated.json";
import type { BlogAuthor, BlogPost } from "../../lib/adminServerApi";

interface BlogDetailsProps {
  slug: string;
  initialData: BlogPost | null;
  initialAuthor: BlogAuthor;
  initialRelatedArticles: BlogPost[];
  initialRelatedHeading: string;
  initialRelatedServices: unknown[];
}

const BlogDetails = ({
  slug,
  initialData,
  initialAuthor,
  initialRelatedArticles,
  initialRelatedHeading,
  initialRelatedServices,
}: BlogDetailsProps) => {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);

  // Reading-progress state — sticky thin yellow bar at top of
  // viewport while the user is mid-article. Same pattern as
  // /job. Mounts only while the article overlaps the
  // viewport so other sections + other pages don't wear it.
  const articleRef = useRef(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showReadingProgress, setShowReadingProgress] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }

    // Reset stale data immediately on slug change so navigating
    // /blog/A → /blog/B doesn't briefly render
    // A's content while B's fetch is in flight. Same flicker-fix
    // pattern as the /services / /creatives / /service-details
    // / /job pages.
    setData(undefined);

    /* Markdown-first resolution: if the slug matches a post in
       the build-time manifest, render that immediately — no API
       call needed. Falls through to the Laravel API for posts
       that exist only in the admin DB (the existing 7 posts
       and any added there in the future). */
    const mdPost = (blogManifest?.posts || []).find((p) => p.slug === slug);
    if (mdPost) {
      setData(mdPost);
      return;
    }

    let cancelled = false;

    const getBlogDetailsApi = async () => {
      try {
        /* Phase 5l: fetch from the API blog-posts by slug. */
        const url = new URL("/content-api/blog-posts", window.location.origin);
        url.searchParams.set("where[slug][equals]", slug);
        url.searchParams.set("limit", "1");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        setData(body?.docs?.[0] ?? null);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message);
      }
    };

    getBlogDetailsApi();
    return () => { cancelled = true; };
  }, [slug, initialData]);

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
  }, [data]);

  if (error) return <div className="blog-details-error">Error: {error}</div>;

  // Author id is read defensively from a few likely field names.
  // The admin schema isn't strictly typed on the frontend, so we
  // try `author_id` (most common), then fall back to `author?.id`.
  // BlogAuthorCard handles missing id with its own Cocoma-desk
  // fallback — never renders empty.
  const authorId = data?.author_id ?? data?.author?.id ?? null;

  return (
    <>
      <div className="blog-details-page-wrapper">
        <article
          ref={articleRef}
          className="blog-details-article-section"
        >
          <BlogDetailsContent data={data} />
        </article>

        {/* Closing rails — only mount once the article data has
            landed. Order is intentional: byline (credibility +
            personal CTA) → services (in-house help) → related
            articles (continued reading). Each section degrades
            silently if its data isn't available, so the page
            still reads cleanly on partial failures. */}
        {data && (
          <>
            <section className="blog-details-author-section">
              <BlogAuthorCard author={initialAuthor} />
            </section>

            <section className="blog-details-services-section">
              <BlogRelatedServices initialServices={initialRelatedServices} />
            </section>

            <section className="blog-details-related-section">
              <BlogRelatedArticles
                currentArticle={data}
                initialItems={initialRelatedArticles}
                initialHeading={initialRelatedHeading}
              />
            </section>
          </>
        )}
      </div>

      {/* Reading progress — fixed thin yellow bar at the top of
          the viewport. Mounts only while the article is in view. */}
      {showReadingProgress && (
        <div className="blog-details-reading-progress" aria-hidden="true">
          <div
            className="blog-details-reading-progress-fill"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      {/* Sticky bottom-right "Talk to Anil" chip — same component
          used on /SingleVideo, /Service, /SingleService. Provides
          an always-available CTA without competing with the
          in-flow author card (which is centered, in-content). */}
      <FloatingCallChip />
    </>
  );
};

export default BlogDetails;
