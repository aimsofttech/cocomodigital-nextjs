import { FiStar } from "react-icons/fi";
import type { ReactNode } from "react";
import { CtaGroup, HeroPill } from "./Primitives";
import { HIGHLIGHT } from "./theme";
import type { CtaLink, HeroBadge, HeroHeadline, TrustSignal } from "./types";

/* Shared hero: copy column on the left, product-style dashboard
   mock on the right. The site header is fixed but the shell
   already renders an 84px spacer above <main>, so no extra top
   padding is needed here. */

export default function GrowthHero({
  badge,
  headline,
  paragraphs,
  ctas,
  trust,
  dashboard,
  dashboardAlt = "",
  id,
}: {
  badge: HeroBadge;
  headline: HeroHeadline[];
  paragraphs: string[];
  ctas: CtaLink[];
  trust: TrustSignal;
  dashboard: ReactNode;
  /** Alt text for the dashboard mock; "" marks it decorative. */
  dashboardAlt?: string;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="w-full bg-page">
      <div className="mx-auto grid w-full max-w-360 grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 lg:px-10 lg:py-16">
        <div>
          <HeroPill icon={badge.icon} label={badge.label} />

          <h1
            id={id}
            className="mt-5 font-satoshi text-3xl leading-[1.12] font-black tracking-tight text-balance text-strong sm:text-4xl lg:text-5xl"
          >
            {headline.map((line) => (
              /* The accent line keeps near-black type and takes the brand
                 as a marker highlight instead — yellow text on white would
                 be unreadable, and this is the site's own emphasis motif. */
              <span key={line.text} className="block text-strong">
                {line.accent ? (
                  <span className={`${HIGHLIGHT} box-decoration-clone`}>{line.text}</span>
                ) : (
                  line.text
                )}
              </span>
            ))}
          </h1>

          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base"
            >
              {paragraph}
            </p>
          ))}

          <CtaGroup ctas={ctas} className="mt-7" />

          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            {/* Placeholder client avatars — swap the initials for real
                headshots once the assets land in /public. */}
            <ul className="flex -space-x-2.5" aria-hidden="true">
              {trust.initials.map((initials) => (
                <li
                  key={initials}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-strong bg-page-tint text-[11px] font-black text-strong"
                >
                  {initials}
                </li>
              ))}
            </ul>

            <div>
              <p className="flex items-center gap-0.5" aria-label="Rated 5 out of 5">
                {/* Brand fill with a near-black stroke — keeps the stars
                    legible on white, which a flat yellow glyph would not be. */}
                {Array.from({ length: 5 }).map((_, index) => (
                  <FiStar
                    key={index}
                    className="h-4 w-4 fill-brand text-strong"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                ))}
              </p>
              <p className="mt-1 max-w-[18rem] text-sm leading-snug text-muted">
                {trust.label}
              </p>
            </div>
          </div>
        </div>

        {/* The dashboard is an illustration built from live-looking but
            invented numbers, so it is announced as a single labelled image
            rather than as a table of figures a reader might take literally. */}
        <div
          className="min-w-0"
          {...(dashboardAlt
            ? { role: "img", "aria-label": dashboardAlt }
            : { "aria-hidden": true })}
        >
          {dashboard}
        </div>
      </div>
    </section>
  );
}
