import { FiChevronDown, FiMinus, FiPlus } from "react-icons/fi";
import type { FaqItem } from "./types";
import { ICON_CHIP } from "./theme";

/* Native <details> accordion — keyboard accessible and fully
   functional without JavaScript, so it also renders correctly in
   the statically prerendered output. */

export default function FaqAccordion({
  items,
  variant = "plain",
}: {
  items: FaqItem[];
  /** "marked" adds the brand bullet + chevron treatment */
  variant?: "plain" | "marked";
}) {
  return (
    <div className="mx-auto mt-8 max-w-4xl space-y-3">
      {items.map(({ question, answer }) => (
        <details
          key={question}
          /* The open row lifts onto a yellow offset shadow, matching how
             every other expanded/active surface on the site behaves. */
          className="group rounded-sticker border-2 border-strong bg-page transition-shadow duration-150 open:shadow-[4px_4px_0_var(--brand,#fff000)]"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-bold text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-strong sm:px-5 [&::-webkit-details-marker]:hidden">
            {variant === "marked" ? (
              <span className={`${ICON_CHIP} h-5.5 w-5.5 rounded-full`}>
                <FiPlus className="h-3 w-3" aria-hidden="true" />
              </span>
            ) : null}

            <span className="flex-1">{question}</span>

            {variant === "marked" ? (
              <FiChevronDown
                className="h-4 w-4 shrink-0 text-strong transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            ) : (
              <>
                <FiPlus
                  className="h-4 w-4 shrink-0 text-muted group-open:hidden"
                  aria-hidden="true"
                />
                <FiMinus
                  className="hidden h-4 w-4 shrink-0 text-strong group-open:block"
                  aria-hidden="true"
                />
              </>
            )}
          </summary>

          <div className="border-t-2 border-strong/12 px-4 pt-3 pb-4 text-sm leading-relaxed text-muted sm:px-5">
            {answer}
          </div>
        </details>
      ))}
    </div>
  );
}
