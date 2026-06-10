"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * MarkdownBody — render a plain-Markdown string as sanitised HTML.
 *
 * Used by the Phase 6 public surfaces (Campaigns / SocialPosts /
 * AIShowcases) where Studio writes long-form fields as Markdown
 * via the textarea editor. Same defensive pattern as the
 * /blog/[slug] markdown fallback in BlogDetailsContent — marked +
 * DOMPurify, with the GFM + breaks options that match the editor's
 * inline hint copy ("Use # Heading, **bold**, *italic*, - list,
 * [link](url)").
 *
 * Server-renders an empty fragment to avoid hydration drift; the
 * client useMemo runs after mount and sanitises with the browser
 * DOMPurify. If the field is empty, the component renders nothing
 * (no empty <div>).
 */
export default function MarkdownBody({
  source,
  className = "",
}: {
  source?: string;
  className?: string;
}) {
  const html = useMemo(() => {
    if (!source || !source.trim()) return "";
    if (typeof window === "undefined") return ""; // hydration-safe
    try {
      const raw = marked.parse(source, { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
    } catch {
      return "";
    }
  }, [source]);
  if (!html) return null;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
