import Link from "next/link";
import type { ReactNode } from "react";
import type { CtaLink } from "./types";

/* Building blocks shared by all three growth landing pages.

   These pages are light-themed (white page, near-black type, red
   accent) to match the approved designs, so colours are written as
   explicit Tailwind utilities rather than the site's yellow brand
   tokens. Everything here is Tailwind only — no stylesheet, no
   inline styles. */

/* ── Layout shell ─────────────────────────────────────────────
   Every band is the same centred, gutter-padded container.
   `tone` swaps the white default for the pale red band used by
   the "problems we solve" section. */

export function Section({
  children,
  labelledBy,
  tone = "white",
  className = "",
}: {
  children: ReactNode;
  labelledBy?: string;
  tone?: "white" | "tint";
  className?: string;
}) {
  const toneClass = tone === "tint" ? "bg-[#EE2B2C]/5" : "bg-white";

  return (
    <section aria-labelledby={labelledBy} className={`w-full ${toneClass} ${className}`}>
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
  align = "center",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  id?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const alignClass = align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl text-left";

  return (
    <div className={`${alignClass} ${className}`}>
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-[#EE2B2C] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className="text-2xl font-bold tracking-tight text-balance text-neutral-900 sm:text-3xl lg:text-[34px] lg:leading-tight"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">{description}</p>
      ) : null}
    </div>
  );
}

/* ── Call-to-action buttons ───────────────────────────────────
   `tone` picks the surface the button sits on. Keeping both tones
   in this lookup avoids overriding colours through a trailing
   className, where the winner would depend on Tailwind's output
   order rather than the order the classes are written in. */

const CTA_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EE2B2C]";

const CTA_VARIANTS = {
  default: {
    solid: "bg-[#EE2B2C] text-white hover:bg-[#d21f20]",
    outline: "border border-[#EE2B2C] bg-white text-[#EE2B2C] hover:bg-[#EE2B2C] hover:text-white",
  },
  onRed: {
    solid: "bg-white text-[#EE2B2C] hover:bg-neutral-100",
    outline: "border border-white bg-transparent text-white hover:bg-white hover:text-[#EE2B2C]",
  },
} as const;

export type CtaTone = keyof typeof CTA_VARIANTS;

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
    <p className="inline-flex items-center gap-2 rounded-full bg-[#EE2B2C] px-4 py-1.5 text-xs font-semibold text-white sm:text-[13px]">
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </p>
  );
}

/* ── Check bullet used inside the format showcase panels ──── */

export function CheckBullet({
  children,
  tone = "red",
}: {
  children: ReactNode;
  tone?: "red" | "sky";
}) {
  const dotClass = tone === "sky" ? "bg-sky-600" : "bg-[#EE2B2C]";

  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${dotClass}`}
      >
        <svg
          viewBox="0 0 12 12"
          className="h-2.5 w-2.5 fill-none stroke-white stroke-[2.5]"
          aria-hidden="true"
        >
          <path d="M2.5 6.2 4.8 8.5 9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm leading-relaxed text-neutral-700">{children}</span>
    </li>
  );
}
