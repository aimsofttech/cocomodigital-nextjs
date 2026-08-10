import { FiChevronDown, FiMinus, FiPlus } from "react-icons/fi";
import type { FaqItem } from "./types";

/* Native <details> accordion — keyboard accessible and fully
   functional without JavaScript, so it also renders correctly in
   the statically prerendered output. */

export default function FaqAccordion({
  items,
  variant = "plain",
}: {
  items: FaqItem[];
  /** "marked" adds the red bullet + chevron treatment */
  variant?: "plain" | "marked";
}) {
  return (
    <div className="mx-auto mt-8 max-w-4xl space-y-3">
      {items.map(({ question, answer }) => (
        <details
          key={question}
          className="group rounded-xl border border-neutral-200 bg-white open:shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-medium text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EE2B2C] sm:px-5 [&::-webkit-details-marker]:hidden">
            {variant === "marked" ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EE2B2C] text-white">
                <FiPlus className="h-3 w-3" aria-hidden="true" />
              </span>
            ) : null}

            <span className="flex-1">{question}</span>

            {variant === "marked" ? (
              <FiChevronDown
                className="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            ) : (
              <>
                <FiPlus
                  className="h-4 w-4 shrink-0 text-neutral-400 group-open:hidden"
                  aria-hidden="true"
                />
                <FiMinus
                  className="hidden h-4 w-4 shrink-0 text-[#EE2B2C] group-open:block"
                  aria-hidden="true"
                />
              </>
            )}
          </summary>

          <div className="border-t border-neutral-100 px-4 pt-3 pb-4 text-sm leading-relaxed text-neutral-500 sm:px-5">
            {answer}
          </div>
        </details>
      ))}
    </div>
  );
}
