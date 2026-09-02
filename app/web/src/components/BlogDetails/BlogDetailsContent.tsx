// @ts-nocheck
"use client";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import moment from "moment/moment";
import { IoArrowBack } from "react-icons/io5";
import { marked } from "marked";
import DOMPurify from "dompurify";
import EditPencil from "../common/EditPencil/EditPencil";
import LexicalBody from "../common/LexicalBody/LexicalBody";
import { adminRoutes } from "../../lib/adminEditRoutes";

/* Phase 1.0 Studio 2026-05-24: when the post was authored via
   /studio, the body lives in `body_markdown` (plain markdown).
   When the post was authored via /admin, the body lives in
   `content` (Lexical AST). Prefer Lexical when present so legacy
   posts render unchanged. Sanitised through DOMPurify because
   the markdown comes from editors with publish rights, but
   defence-in-depth is cheap. */
const hasLexicalBody = (data: any): boolean => {
  const d = data?.description;
  if (!d) return false;
  if (typeof d === "string") return d.trim().length > 0;
  if (typeof d === "object" && d?.root) return true;
  return false;
};

const renderMarkdown = (md: string): string => {
  try {
    const html = marked.parse(md, { breaks: true, gfm: true }) as string;
    if (typeof window === "undefined") return html;
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  } catch {
    return "";
  }
};

/**
 * <BlogDetailsContent /> — sticker-language article view.
 *
 * Replaces the previous bare structure (yellow "Back" button +
 * h1 + image + dangerously-set HTML + a second "Back" button at
 * the foot) with a proper article layout:
 *
 *   - Quiet "← All posts" back link at top
 *   - Date eyebrow
 *   - Display-scale title
 *   - Optional sticker-framed cover image
 *   - Article body with token-typography (yellow check bullets,
 *     h2 underlines, lead-paragraph treatment, marker-pen highlight,
 *     blockquote callout — same pattern shipped on /job)
 *
 * Renders a hero skeleton when data is undefined so the page
 * shell paints immediately (no full-page Loader gate).
 */
const BlogDetailsContent = ({ data }) => {
  const isLoading = data === undefined || data === null;

  return (
    <div className="blog-details-content-wrapper">
      {/* Quiet back link — small muted UPPERCASE eyebrow, NOT a
          sticker pill button. Browsers + page header handle the
          "go back" job already; this is just the explicit on-page
          path. */}
      <Link to="/blog" className="blog-details-back-link">
        <IoArrowBack aria-hidden="true" />
        All posts
      </Link>

      {isLoading ? (
        <div
          className="blog-details-hero-skeleton"
          aria-hidden="true"
        />
      ) : (
        <>
          <header className="blog-details-hero">
            {data?.date && (
              <p className="blog-details-eyebrow">
                {moment(data.date).format("MMMM Do, YYYY")}
              </p>
            )}
            <h1 className="blog-details-title font-primary edit-host">
              {data?.title}
              <EditPencil
                to={adminRoutes.blog.post(data?.id)}
                label={data?.title || "this post"}
              />
            </h1>
          </header>

          {data?.image && (
            <div className="blog-details-cover">
              <Image
                className="blog-details-cover-img"
                src={data.image}
                alt={data?.title || "blog cover"}
                width={1200}
                height={630}
                style={{ width: "100%", height: "auto" }}
              />
            </div>
          )}

          {/* Article body — admin authored. Pearl writes the post
              body via the API's Lexical editor in admin, which sends
              a Lexical-AST object (NOT an HTML string). Token-driven
              typography defaults applied via .blog-details-body
              styles in BlogDetailsContent.css.
              Phase 5+ 2026-05-22: switched from dangerouslySetInnerHTML
              (which rendered [object Object] on Lexical input) to
              the shared LexicalBody helper — transparently handles
              both Lexical AST + legacy HTML strings. */}
          {hasLexicalBody(data) ? (
            <LexicalBody
              data={data?.description}
              className="blog-details-body"
            />
          ) : data?.body_markdown ? (
            /* Studio markdown fallback. Same .blog-details-body
               class so token typography (h2 underlines, lead p,
               bullet styles) applies identically. */
            <div
              className="blog-details-body"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(data.body_markdown),
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
};

export default BlogDetailsContent;
