import type { ProcessStep } from "./types";
import { STEP_MARKER } from "./theme";

/* Numbered six-step timeline. The dashed connector only appears
   once the steps sit on a single row (lg+); on smaller screens
   the steps stack and the line would read as noise. */

export default function ProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  return (
    <div className="relative mt-10">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-6 right-[8%] left-[8%] hidden border-t-2 border-dashed border-strong/25 lg:block"
      />
      <ol className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
        {steps.map((step, index) => (
          <li key={step.title} className="text-center">
            {/* The ring matches the section surface so the marker punches a
                clean gap through the dashed connector behind it. Both call
                sites render inside a default-tone <Section> (bg-page); if one
                ever moves to tone="tint", switch this to ring-page-soft. */}
            <span
              className={`${STEP_MARKER} mx-auto h-12 w-12 text-base shadow-[3px_3px_0_var(--brand,#fff000)] ring-4 ring-page`}
            >
              {index + 1}
            </span>
            <h3 className="mt-4 text-sm font-black text-strong">{step.title}</h3>
            <p className="mx-auto mt-1.5 max-w-[22ch] text-xs leading-relaxed text-muted">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
