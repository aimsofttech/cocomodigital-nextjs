// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import moment from "moment/moment";
import { FaArrowRight } from "react-icons/fa";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";
import { adminRoutes } from "@/src/lib/adminEditRoutes";

const BlogRelatedArticles = ({
  currentArticle,
  initialItems = [],
  initialHeading = "More from the Cocoma desk",
}) => {
  const [items, setItems] = useState(initialItems);
  const [headingMode, setHeadingMode] = useState(
    initialHeading === "More on this topic" ? "category" : "latest"
  ); // "category" | "latest"
  const [resolved, setResolved] = useState(initialItems.length > 0);

  useEffect(() => {
    if (initialItems.length > 0) return;
    let cancelled = false;

    // The blog item schema isn't strictly typed on the frontend —
    // try a few likely field names for the category slug. If the
    // admin API uses a different name we'll still gracefully degrade
    // to the "latest" rail.
    const subcategorySlug =
      currentArticle?.subcategory ||
      currentArticle?.category_slug ||
      currentArticle?.category?.slug ||
      "";

    const currentId = currentArticle?.id;

    const fetchList = async () => {
      const fetchPosts = async (filterCategorySlug?: string) => {
        const url = new URL("/content-api/blog-posts", window.location.origin);
        if (filterCategorySlug) {
          url.searchParams.set("where[category.slug][equals]", filterCategorySlug);
        }
        url.searchParams.set("limit", "6");
        url.searchParams.set("sort", "-published_at");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) return [];
        const body = await res.json();
        return body?.docs ?? [];
      };

      try {
        /* Phase 5l: the API blog-posts filter by category slug,
           fall back to latest across the blog. */
        if (subcategorySlug) {
          const list = (await fetchPosts(subcategorySlug))
            .filter((b: any) => b?.id && b.id !== currentId)
            .slice(0, 3);
          if (list.length >= 2) {
            if (!cancelled) {
              setItems(list);
              setHeadingMode("category");
              setResolved(true);
            }
            return;
          }
        }
        const list = (await fetchPosts())
          .filter((b: any) => b?.id && b.id !== currentId)
          .slice(0, 3);
        if (!cancelled) {
          setItems(list);
          setHeadingMode("latest");
        }
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
  }, [currentArticle, initialItems.length]);

  if (!resolved) return null;
  if (!items.length) return null;

  const heading =
    headingMode === "category"
      ? "More on this topic"
      : "More from the Cocoma desk";

  return (
    <section
      className="blog-related-articles"
      aria-labelledby="blog-related-articles-heading"
    >
      <header className="blog-related-articles-header">
        <p className="blog-related-articles-eyebrow">Keep reading</p>
        <h2
          id="blog-related-articles-heading"
          className="blog-related-articles-heading font-primary"
        >
          {heading}
        </h2>
      </header>

      <div className="blog-related-articles-grid">
        {items.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="blog-related-article-card edit-host"
          >
            <EditPencil
              asButton
              to={adminRoutes.blog.post(post.id)}
              label={post.title || "this post"}
            />
            <div className="blog-related-article-image-wrapper">
              {post?.image && (
                <Image
                  className="blog-related-article-img"
                  src={post.image}
                  alt={post?.title || "blog cover"}
                  width={600}
                  height={400}
                  style={{ width: "100%", height: "auto" }}
                />
              )}
            </div>
            <div className="blog-related-article-body">
              {post?.date && (
                <p className="blog-related-article-date">
                  {moment(post.date).format("MMM Do, YYYY")}
                </p>
              )}
              <h3 className="blog-related-article-title font-primary">
                {post?.title}
              </h3>
              <span className="blog-related-article-cta">
                Read post
                <FaArrowRight aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="blog-related-articles-footer">
        <Link to="/blog" className="blog-related-articles-all">
          See all posts
          <FaArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default BlogRelatedArticles;
