import type { ProcessStep } from "./types";

/* Numbered six-step timeline. The dashed connector only appears
   once the steps sit on a single row (lg+); on smaller screens
   the steps stack and the line would read as noise. */

export default function ProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  return (
    <div className="relative mt-10">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-6 right-[8%] left-[8%] hidden border-t-2 border-dashed border-[#EE2B2C]/40 lg:block"
      />
      <ol className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
        {steps.map((step, index) => (
          <li key={step.title} className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EE2B2C] text-base font-bold text-white ring-4 ring-white">
              {index + 1}
            </span>
            <h3 className="mt-3 text-sm font-semibold text-neutral-900">{step.title}</h3>
            <p className="mx-auto mt-1.5 max-w-[22ch] text-xs leading-relaxed text-neutral-500">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
