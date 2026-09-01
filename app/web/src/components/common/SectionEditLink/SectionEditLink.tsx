"use client";

import { FaPencilAlt } from "react-icons/fa";
import { ADMIN_BASE_URL, useAdminSession } from "@/src/lib/adminSession";

/**
 * The little "Edit" pencil beside a section, for editors only.
 *
 * Renders NOTHING at all unless the visitor holds update permission on the
 * module — so for the public, and for a role without it, the page's markup is
 * byte-for-byte what it was before this existed. That is deliberate: the page
 * is the site's ranking target and its output should not change shape based on
 * a feature only staff can see.
 *
 * The link opens the section's own step of the admin editor in a new tab, so
 * the page being edited stays open beside it. Nothing new was built to receive
 * it: `step` addresses the existing Podcast page wizard, whose steps already
 * map one-to-one onto the bands of this page.
 *
 * Hiding the pencil is a convenience, not a control. The admin route checks the
 * role again, and every write is checked a third time by the API.
 */

export interface SectionEditLinkProps {
  /** Permission module that owns this section, e.g. "podcast". */
  module: string;
  /** Admin path to open, relative to the panel root (no leading slash). */
  to: string;
  /** Names the section or item in the tooltip and for screen readers. */
  label: string;
  /* Icon only, and smaller — for a single card or row, where the word "Edit"
     would crowd the content it sits on. */
  compact?: boolean;
}

export default function SectionEditLink({ module, to, label, compact = false }: SectionEditLinkProps) {
  const { can } = useAdminSession();

  if (!can(module, "update")) return null;

  /* The slot is a zero-height block that establishes the positioning context
     for the pencil. Doing it here rather than by making the section itself
     `position: relative` matters: several of these sections contain absolutely
     positioned children (the problem band's full-bleed backdrop, for one) whose
     containing block would have changed underneath them. */
  return (
    <div className={`section-edit-slot${compact ? " section-edit-slot--item" : ""}`}>
    <a
      className={`section-edit-link${compact ? " section-edit-link--item" : ""}`}
      href={`${ADMIN_BASE_URL}/${to.replace(/^\/+/, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`Edit ${label} in the admin panel`}
      aria-label={`Edit ${label} in the admin panel`}
    >
      <FaPencilAlt aria-hidden="true" />
      {!compact && <span>Edit</span>}
    </a>
    </div>
  );
}
