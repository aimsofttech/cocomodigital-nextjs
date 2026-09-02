"use client";

import EditPencil from "@/src/components/common/EditPencil/EditPencil";

/**
 * The podcast page's edit affordance — now a thin adapter over EditPencil.
 *
 * This used to be the implementation, and it was the only one: it predates
 * the rollout of edit pencils to the rest of the site. Two things about it
 * had since drifted out of line with everywhere else.
 *
 * It rendered the WORD "Edit" beside the pencil whenever `compact` was not
 * set, as a rounded pill — so the podcast page's band-level controls looked
 * like a different feature from the round icon every other page carries.
 * There is now one chip, one shape and one size across the whole site, and
 * no text on any of them.
 *
 * It also took `module` as a prop. EditPencil derives the owning module from
 * the admin path instead, which is strictly safer: a caller that names its
 * own module can name the wrong one and draw a pencil for a role that cannot
 * use it. Every path this component is handed begins `podcast/`, so the
 * derivation lands on the same answer the prop was passing — the prop is
 * accepted and ignored rather than removed, to leave the podcast page's call
 * sites untouched.
 *
 * New call sites should use EditPencil directly.
 */

export interface SectionEditLinkProps {
  /** Ignored — the module is derived from `to`. Kept for call-site
   *  compatibility with the podcast page. */
  module?: string;
  /** Admin path to open, relative to the panel root. */
  to: string;
  /** Names the section or item in the tooltip and for screen readers. */
  label: string;
  /** Ignored — there is one size now. Kept for call-site compatibility. */
  compact?: boolean;
}

export default function SectionEditLink({ to, label }: SectionEditLinkProps) {
  return <EditPencil to={to} label={label} />;
}
