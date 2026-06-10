// @ts-nocheck
"use client";

import DOMPurify from "dompurify";

/**
 * <LexicalBody /> — renders an article body from the content API.
 *
 * The standalone Express + MongoDB API returns rich-text fields as
 * sanitised HTML strings (e.g. blog_content, job_description). This
 * component renders that HTML safely. The prop name is kept for
 * backward compatibility with existing callers (BlogDetailsContent,
 * JobDetails); the previous the API Lexical-AST path was removed
 * along with the CMS.
 *
 *   • String        → DOMPurify-sanitised dangerouslySetInnerHTML
 *   • null/undefined / other shape → null (no crash, no empty div)
 */

interface LexicalBodyProps {
  /** HTML string (or null/undefined) */
  data: unknown;
  /** Wrapper className for the rendered body */
  className?: string;
}

const LexicalBody = ({ data, className }: LexicalBodyProps) => {
  if (typeof data !== "string" || data.trim() === "") return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data) }}
    />
  );
};

export default LexicalBody;
