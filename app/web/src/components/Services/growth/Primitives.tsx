import Link from "next/link";
import type { ReactNode } from "react";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";
import type { CtaLink, HeadingLevel } from "./types";
import {
  CTA_BASE,
  CTA_VARIANTS,
  EYEBROW,
  HIGHLIGHT,
  ICON_CHIP,
  SECTION_TONES,
  type CtaTone,
} from "./theme";

/* Building blocks shared by all three growth landing pages.

   Colours come from the site's semantic tokens via ./theme, so these
   pages match the rest of Cocoma rather than carrying their own
   palette. Everything here is Tailwind only — no stylesheet, no
   inline styles. */

export type { CtaTone };

/* ── Layout shell ─────────────────────────────────────────────
   Every band is the same centred, gutter-padded container.
   `tone` swaps the page default for the soft grey the rest of the
   site uses to break one section from the next. */

export function Section({
  children,
  labelledBy,
  tone = "page",
  className = "",
  editTo,
  editLabel,
}: {
  children: ReactNode;
  labelledBy?: string;
  tone?: keyof typeof SECTION_TONES;
  className?: string;
  /** Admin path for this band, when the caller knows one. */
  editTo?: string;
  editLabel?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      /* `edit-host` only does anything once the band actually contains a
         pencil — the :has() rule in globals.css sees to that — so adding it
         unconditionally changes nothing for a visitor who is not an editor. */
      className={`w-full ${SECTION_TONES[tone]} ${className} edit-host`}
    >
      {editTo ? <EditPencil to={editTo} label={editLabel || "this section"} /> : null}
      {/* 1440px matches --content-max-w, the width the rest of the
          site lays out to. */}
      <div className="mx-auto w-full max-w-360 px-4 py-12 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
        {children}
      </div>
    </section>
  );
}

/* ── Section heading ──────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  level = 2,
  align = "center",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  id?: string;
  /** Band headings are H2s under the hero's H1; override only to re-nest. */
  level?: HeadingLevel;
  align?: "center" | "left";
  className?: string;
}) {
  const alignClass =
    align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl text-left";

  return (
    <div className={`${alignClass} ${className}`}>
      {eyebrow ? (
        <p className="mb-3">
          {/* Highlight sits on the inline span, not the block, so the
              marker hugs the words instead of the full column width. */}
          <span className={`${EYEBROW} ${HIGHLIGHT}`}>{eyebrow}</span>
        </p>
      ) : null}
      <Heading
        level={level}
        id={id}
        className="font-satoshi text-2xl font-black tracking-tight text-balance text-strong sm:text-3xl lg:text-[40px] lg:leading-tight"
      >
        {title}
      </Heading>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/* ── Call-to-action buttons ───────────────────────────────────
   `tone` picks the surface the button sits on. Keeping both tones
   in this lookup avoids overriding colours through a trailing
   className, where the winner would depend on Tailwind's output
   order rather than the order the classes are written in. */

export function CtaButton({
  cta,
  tone = "default",
  className = "",
}: {
  cta: CtaLink;
  tone?: CtaTone;
  className?: string;
}) {
  const Icon = cta.icon;

  return (
    <Link
      href={cta.href}
      className={`${CTA_BASE} ${CTA_VARIANTS[tone][cta.variant ?? "solid"]} ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {cta.label}
    </Link>
  );
}

export function CtaGroup({
  ctas,
  tone = "default",
  className = "",
}: {
  ctas: CtaLink[];
  tone?: CtaTone;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${className}`}>
      {ctas.map((cta) => (
        <CtaButton key={cta.label} cta={cta} tone={tone} />
      ))}
    </div>
  );
}

/* ── Badge pill above the hero headline ───────────────────── */

export function HeroPill({ icon: Icon, label }: { icon?: CtaLink["icon"]; label: string }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-pill border-2 border-strong bg-brand px-4 py-1.5 text-xs font-black tracking-wide text-brand-on uppercase shadow-[2px_2px_0_var(--text-strong,#111)] sm:text-[13px]">
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </p>
  );
}

/* ── Check bullet used inside the format showcase panels ──── */

export function CheckBullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={`${ICON_CHIP} mt-0.5 h-4.5 w-4.5 rounded-full`}>
        <svg
          viewBox="0 0 12 12"
          className="h-2.5 w-2.5 fill-none stroke-current stroke-[2.5]"
          aria-hidden="true"
        >
          <path d="M2.5 6.2 4.8 8.5 9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm leading-relaxed text-body">{children}</span>
    </li>
  );
}

/* ── Heading element ──────────────────────────────────────────
   Renders h1-h6 from a numeric level so a block can be nested one
   step under whatever contains it. Purely semantic — the size
   always comes from the caller's className, so moving a card from
   an H3 to an H4 context changes the outline and nothing visual. */

export function Heading({
  level,
  id,
  className = "",
  children,
}: {
  level: HeadingLevel;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}
