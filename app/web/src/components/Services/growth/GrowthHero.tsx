import { FiStar } from "react-icons/fi";
import type { ReactNode } from "react";
import { CtaGroup, HeroPill } from "./Primitives";
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
  id,
}: {
  badge: HeroBadge;
  headline: HeroHeadline[];
  paragraphs: string[];
  ctas: CtaLink[];
  trust: TrustSignal;
  dashboard: ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="w-full bg-white">
      <div className="mx-auto grid w-full max-w-360 grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 lg:px-10 lg:py-16">
        <div>
          <HeroPill icon={badge.icon} label={badge.label} />

          <h1
            id={id}
            className="mt-5 text-3xl leading-[1.12] font-extrabold tracking-tight text-balance text-neutral-900 sm:text-4xl lg:text-5xl"
          >
            {headline.map((line) => (
              <span
                key={line.text}
                className={`block ${line.accent ? "text-[#EE2B2C]" : "text-neutral-900"}`}
              >
                {line.text}
              </span>
            ))}
          </h1>

          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-[15px]"
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-linear-to-br from-neutral-300 to-neutral-400 text-[11px] font-semibold text-white"
                >
                  {initials}
                </li>
              ))}
            </ul>

            <div>
              <p className="flex items-center gap-0.5" aria-label="Rated 5 out of 5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <FiStar
                    key={index}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                ))}
              </p>
              <p className="mt-1 max-w-[16rem] text-xs leading-snug text-neutral-500">
                {trust.label}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">{dashboard}</div>
      </div>
    </section>
  );
}
