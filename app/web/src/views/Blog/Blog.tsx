// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { Link } from "@/src/lib/navigation";
import { FaArrowRight } from "react-icons/fa";
import Category from "../../components/Blog/Category/Category";
import BlogCard from "../../components/Blog/blogCard/BlogCard";
import Pagination from "../../components/common/Pagination/Pagination";
import type { BlogCategory, BlogPost } from "../../lib/adminServerApi";

import blogManifest from "../../content/blog.generated.json";

interface BlogProps {
  initialCategories: BlogCategory[];
  initialPosts: BlogPost[];
  initialTotal: number;
}

const Blog = ({ initialCategories, initialPosts, initialTotal }: BlogProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState(initialCategories);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [allCardList, setAllCardList] = useState(initialPosts);
  const [cardListCount, setCardListCount] = useState(initialTotal);
  // Loading flag retained for skeleton-state work in future; the
  // page no longer gates first paint on it (see comment below).

  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState(null);
  const limit = 10;
  const totalPages = Math.ceil(cardListCount / limit);
  const offset = (currentPage - 1) * limit;

  // api for fetch all categories list
  useEffect(() => {
    if (initialCategories.length > 0) return;
    const getAllBlogCategory = async () => {
      try {
        /* Phase 5l: the API blog-categories. Adapt to the legacy
           {blog_category_name, sub_categories} shape the Category
           component expects (the API schema is just {name, slug};
           sub_categories isn't modeled there yet). */
        const url = new URL("/content-api/blog-categories", window.location.origin);
        url.searchParams.set("limit", "50");
        url.searchParams.set("depth", "0");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const adapted = (body?.docs || []).map((c: any) => ({
          id: c.id,
          blog_category_name: c.name,
          blog_category_slug: c.slug,
          slug: c.slug,
          sub_categories: [],
        }));
        setCategories(adapted);
      } catch (err: any) {
        console.log("Error", err);
        setError(err?.message);
      }
    };
    getAllBlogCategory();
  }, [initialCategories.length]);

  // fetch all card list
  useEffect(() => {
    if (currentPage === 1 && !activeCategory && !searchInput) {
      setAllCardList(initialPosts);
      setCardListCount(initialTotal);
      setLoadingList(false);
      return;
    }

    // Reset stale data immediately on filter change so the user
    // doesn't briefly see the previous filter's posts while the
    // new fetch is in flight. Same flicker-fix pattern as the
    // /services / /creatives / /service-details pages.
    setAllCardList([]);
    setLoadingList(true);

    const getAllBlogList = async () => {
      try {
        /* Phase 5l: the API blog-posts filtered by category slug
           + title contains. Page-based pagination. */
        const url = new URL("/content-api/blog-posts", window.location.origin);
        if (activeCategory) {
          url.searchParams.set("where[category.slug][equals]", activeCategory);
        }
        if (searchInput) {
          url.searchParams.set("where[title][contains]", searchInput);
        }
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("page", String(Math.floor(offset / limit) + 1));
        url.searchParams.set("sort", "-published_at");
        url.searchParams.set("depth", "1");
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        const body = r.ok ? await r.json() : { docs: [], totalDocs: 0 };
        const apiPosts = body?.docs || [];
        // Surface the API total so the markdown merge logic below
        // can render an accurate count + pagination.
        const apiTotal = body?.totalDocs || 0;
        // (declared again here as a const so the rest of the
        // existing function continues to read `response` shape.)
        const response = { data: { data: { blogItems: apiPosts, total_blog: apiTotal } } };
        // satisfy the apiTotal use below (used by the count setter)
        void response;

        /* Merge markdown posts (from build-time manifest) with
           Laravel API posts. Markdown is the new source of
           truth for new posts; existing admin-DB posts stay
           live. Slug collisions are resolved with markdown
           winning (rare in practice — markdown slugs are
           explicit; Laravel slugs are auto-derived). */
        const mdPosts = blogManifest?.posts || [];

        // Apply the same search + category filters to markdown
        // posts so the user gets a consistent filtered list
        // across both sources.
        const filteredMd = mdPosts.filter((p) => {
          if (searchInput) {
            const hay = `${p.title} ${p.excerpt}`.toLowerCase();
            if (!hay.includes(searchInput.toLowerCase())) return false;
          }
          if (activeCategory) {
            // Markdown posts use frontmatter `tags` (string array)
            // for filtering. Laravel posts use category_id /
            // subcategory. Treat tag membership as the markdown-
            // side equivalent of subcategory match.
            if (!(p.tags || []).includes(activeCategory)) return false;
          }
          return true;
        });

        // De-dupe by slug — markdown takes priority
        const mdSlugs = new Set(filteredMd.map((p) => p.slug));
        const apiPostsDeduped = apiPosts.filter(
          (p) => !mdSlugs.has(p?.slug)
        );

        const merged = [...filteredMd, ...apiPostsDeduped];

        // Sort newest first by date (markdown frontmatter date,
        // or Laravel `created_at` / `updated_at` field — fall
        // through to title for posts missing date).
        merged.sort((a, b) => {
          const da = a.date || a.created_at || a.updated_at || "";
          const db = b.date || b.created_at || b.updated_at || "";
          if (da && db) return da < db ? 1 : da > db ? -1 : 0;
          return 0;
        });

        setAllCardList(merged);
        if (searchInput || activeCategory) {
          setCardListCount(merged.length);
        } else {
          // Total count = Laravel total + markdown total. Laravel
          // returns total_blog; we add the (post-filter) markdown
          // count for accurate pagination math.
          const apiTotal = response?.data?.data?.total_blog || 0;
          setCardListCount(apiTotal + filteredMd.length);
        }
      } catch (err) {
        console.log("error", err);
        setError(err.message);
      } finally {
        setLoadingList(false);
      }
    };
    getAllBlogList();
  }, [activeCategory, searchInput, limit, offset]);

  // Error early-return preserved — if the API itself fails we
  // short-circuit. Otherwise the page renders progressively
  // (hero + filters paint immediately, cards swap in once the
  // list resolves).
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="blog-outer">
      <div className="blog-main-wrapper">
        {/* ----------------------------------------------------------
            Hero — sticker-language brand intro to the blog. Sets the
            tone before the user scans cards.
            ---------------------------------------------------------- */}
        <section className="blog-hero" aria-labelledby="blog-hero-heading">
          <p className="blog-hero-eyebrow">From the Cocoma desk</p>
          <h1 className="blog-hero-heading" id="blog-hero-heading">
            Notes on{" "}
            <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">video, growth</span>
            {" "}&amp; the craft.
          </h1>
          <p className="blog-hero-pitch">
            What we're learning, shipping, and seeing in video, design,
            growth and channel ops — written by the team behind every
            cut, design and launch at Cocoma.
          </p>
        </section>

        {/* Search + category filter */}
        {categories?.length > 0 && (
          <Category
            categories={categories}
            setActiveCategory={setActiveCategory}
            activeCategory={activeCategory}
            setSearchInput={setSearchInput}
          />
        )}

        {/* Card grid */}
        <div className="blog-main">
          {allCardList?.length > 0 && <BlogCard data={allCardList} />}
          {allCardList?.length === 0 && (
            <div className="blog-card-not-fount-wrapper">
              <h5>
                No posts {activeCategory ? `in ${activeCategory}` : "yet"}
                {searchInput ? ` matching "${searchInput}"` : ""}.
              </h5>
            </div>
          )}
        </div>

        {allCardList?.length > limit && (
          <div className="blog-pagination-wrapper">
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* ----------------------------------------------------------
            Closing CTA — soft conversion ask after the user has
            scanned posts. Sticker card with book-call link, since
            Cocoma's primary conversion goal is bookings.
            ---------------------------------------------------------- */}
        <section className="blog-closer" aria-labelledby="blog-closer-heading">
          <div className="blog-closer-card">
            <h2 className="blog-closer-heading" id="blog-closer-heading">
              Liked what you read?
            </h2>
            <p className="blog-closer-pitch">
              We do this work too. If something here sparked an idea
              for your channel or your brand, let's talk.
            </p>
            <Link to="/ScheduleMeeting" className="blog-closer-cta">
              Book a 15-min call
              <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Blog;
