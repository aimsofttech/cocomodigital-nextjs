import type { ReactNode } from "react";
import { CtaGroup } from "./Primitives";
import type { CtaLink } from "./types";

/* Full-bleed red closing band. The halftone dot texture is an
   arbitrary Tailwind background utility, so no stylesheet is
   needed for it. */

export default function ClosingCta({
  title,
  description,
  ctas,
  illustration,
  id,
}: {
  title: ReactNode;
  description: string;
  ctas: CtaLink[];
  illustration: ReactNode;
  id: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className="relative w-full overflow-hidden bg-linear-to-br from-[#EE2B2C] to-[#b81c1d]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle,rgba(255,255,255,0.2)_1.5px,transparent_1.5px)] bg-size-[16px_16px] lg:block"
      />

      <div className="relative mx-auto grid w-full max-w-360 grid-cols-1 items-center gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-2 lg:px-10 lg:py-16">
        <div className="order-2 lg:order-1">{illustration}</div>

        <div className="order-1 lg:order-2">
          <h2
            id={id}
            className="text-2xl leading-tight font-bold text-balance text-white sm:text-3xl lg:text-[34px]"
          >
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            {description}
          </p>

          <CtaGroup ctas={ctas} tone="onRed" className="mt-7" />
        </div>
      </div>
    </section>
  );
}
