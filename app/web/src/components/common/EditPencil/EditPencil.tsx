"use client";

import { FaPencilAlt } from "react-icons/fa";
import { ADMIN_BASE_URL, useAdminSession } from "@/src/lib/adminSession";
import { moduleForAdminPath } from "@/src/lib/adminEditRoutes";
import { useDemoSession } from "@/src/lib/demoAuth";

/**
 * The edit pencil for one section, card or row — the site-wide affordance.
 *
 * This is the same mechanism the podcast page has had since Phase 16, lifted
 * out of that page and generalised so every page can use it. It renders the
 * icon ALONE: the podcast page's section-level links carry the word "Edit"
 * beside the pencil, but that treatment does not survive contact with cards
 * that are 180px wide, and a mixed vocabulary across the site would be worse
 * than either alone.
 *
 * RENDERS NOTHING unless the visitor is signed in to this site AND their role
 * may update the module that owns the target route. For the public — and for
 * a role without update rights — the markup is byte-for-byte what it was
 * before this existed. That is the whole design constraint: these are content
 * pages that rank, and their output must not change shape for a feature only
 * staff can see.
 *
 * BOTH CONDITIONS ARE REQUIRED, and the second alone was not enough. The
 * permission check keys off the admin token in storage while the header's
 * Logout keys off the site's own session, so a token that outlived the session
 * put pencils on a page that was otherwise telling the visitor they were
 * signed out. Reading the same session the header reads keeps the page telling
 * one story.
 *
 * The module is DERIVED from `to` rather than passed in. A caller that names
 * its own module can get it wrong — claim "home" while linking into /blog —
 * and the pencil would then be drawn for a role that cannot use it. Deriving
 * it from the path makes that unrepresentable. See lib/adminEditRoutes.ts.
 *
 * Hiding the pencil is a convenience, not a control. The admin route checks
 * the role again, and every write is checked a third time by the API.
 */

export interface EditPencilProps {
  /** Admin path to open, relative to the panel root. Build it with
   *  `adminRoutes.*` — never hand-write one at a call site. */
  to: string;
  /** Names the thing being edited, for the tooltip and screen readers. */
  label: string;
  /** Extra class on the slot, for the rare host that needs to nudge it. */
  className?: string;
  /**
   * Render the pill alone, in flow, with no positioning slot of its own.
   *
   * For a host that already ships a positioned wrapper for exactly this —
   * `.blog-card-edit`, `.career-page-card-edit` — where adding the slot's own
   * absolute offset on top of the wrapper's would shift the pencil off the
   * corner the design already places it on.
   */
  bare?: boolean;
  /**
   * Render as a <button> rather than an <a>.
   *
   * For a card whose own root is a link — the related-articles and
   * related-services rails, where the <Link> IS the card. An <a> inside an
   * <a> is not a style problem, it is a parsing one: the HTML parser breaks
   * the inner anchor out of the outer one, so the pencil would end up
   * somewhere else in the document entirely, and hydration would mismatch on
   * top of that.
   *
   * A button is never re-parented. It is still interactive content inside a
   * link, which a validator will flag — but a pencil is only ever in the DOM
   * for a signed-in editor with update rights, so that nesting never reaches
   * a crawler or a public page view.
   */
  asButton?: boolean;
}

export default function EditPencil({
  to,
  label,
  className,
  bare = false,
  asButton = false,
}: EditPencilProps) {
  const signedIn = useDemoSession();
  const { can } = useAdminSession();

  /* Not named `module`: Next forbids assigning that identifier, since it
     collides with the CommonJS binding in a compiled module scope. */
  const owner = moduleForAdminPath(to);

  if (!signedIn) return null;
  if (!owner) return null;
  if (!can(owner, "update")) return null;

  const href = `${ADMIN_BASE_URL}/${to.replace(/^\/+/, "")}`;
  const shared = {
    className: `section-edit-link section-edit-link--item${bare ? " section-edit-link--bare" : ""}`,
    title: `Edit ${label} in the admin panel`,
    "aria-label": `Edit ${label} in the admin panel`,
  };

  const link = asButton ? (
    <button
      type="button"
      {...shared}
      onClick={(event) => {
        /* preventDefault as well as stopPropagation: the host card is a link,
           and a button inside one still submits the click to it otherwise. */
        event.preventDefault();
        event.stopPropagation();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      <FaPencilAlt aria-hidden="true" />
    </button>
  ) : (
    <a
      className={`section-edit-link section-edit-link--item${bare ? " section-edit-link--bare" : ""}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Edit ${label} in the admin panel`}
      aria-label={`Edit ${label} in the admin panel`}
      /* Many of these pencils sit inside a card that is itself one big
         <Link>. Without this, editing a card also navigates the tab that
         launched it to the card's own page — the two existing hand-rolled
         wrappers on the blog and career cards each carried their own
         stopPropagation for this reason. Doing it here means no call site
         has to remember. */
      onClick={(event) => event.stopPropagation()}
    >
      <FaPencilAlt aria-hidden="true" />
    </a>
  );

  if (bare) return link;

  /* The slot is absolutely positioned and zero-sized, so it creates no flex
     or grid item and occupies no track — the host lays out exactly as it did
     without it. Its host is given a positioning context by the `:has()` rule
     in globals.css, which matches only when a pencil is actually present. */
  return (
    <div className={`section-edit-slot section-edit-slot--item${className ? ` ${className}` : ""}`}>
      {link}
    </div>
  );
}
