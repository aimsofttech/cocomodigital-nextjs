import type { ReactNode } from "react";
import { CtaGroup, Heading } from "./Primitives";
import type { CtaLink, HeadingLevel } from "./types";

export default function ClosingCta({
  title,
  description,
  ctas,
  illustration,
  id,
  headingLevel = 2,
}: {
  title: ReactNode;
  description: string;
  ctas: CtaLink[];
  illustration: ReactNode;
  id: string;
  /** A band heading like any other, so it stays an H2 by default. */
  headingLevel?: HeadingLevel;
}) {
  return (
    <section
      aria-labelledby={id}
      className="relative w-full overflow-hidden border-t-2 border-strong bg-dark-surface"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle,rgba(255,240,0,0.22)_1.5px,transparent_1.5px)] bg-size-[16px_16px] lg:block"
      />

      <div className="relative mx-auto grid w-full max-w-360 grid-cols-1 items-center gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-2 lg:px-10 lg:py-16">
        <div className="order-2 lg:order-1">{illustration}</div>

        <div className="order-1 lg:order-2">
          <Heading
            level={headingLevel}
            id={id}
            className="font-satoshi text-2xl leading-tight font-black text-balance text-white sm:text-3xl lg:text-[40px]"
          >
            {title}
          </Heading>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base md:text-lg">
            {description}
          </p>

          <CtaGroup ctas={ctas} tone="onDark" className="mt-7" />
        </div>
      </div>
    </section>
  );
}
