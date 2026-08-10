import type { FeatureItem } from "./types";

/* One grid drives every icon-card block across the three pages:
   the services grid, the "what's included" grid, the problems
   band, the why-choose row and the content-assets grid. Only the
   column count and the icon placement change. */

type Columns = 2 | 3 | 4 | 6;

const COLUMN_CLASSES: Record<Columns, string> = {
  2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
  6: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6",
};

const CARD_BASE =
  "rounded-[10px] border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(16,16,16,0.04)] transition-shadow duration-200 hover:shadow-[0_6px_18px_-8px_rgba(16,16,16,0.18)]";

export default function FeatureGrid({
  items,
  columns = 3,
  layout = "row",
  compact = false,
  className = "",
}: {
  items: FeatureItem[];
  columns?: Columns;
  /** "row" = icon beside the copy, "stack" = icon above centred copy */
  layout?: "row" | "stack";
  /** tighter type + padding, used by the six-across bands */
  compact?: boolean;
  className?: string;
}) {
  return (
    <ul className={`${COLUMN_CLASSES[columns]} ${className}`}>
      {items.map(({ icon: Icon, title, description }) => (
        <li key={title} className="h-full">
          <article
            className={`flex h-full ${CARD_BASE} ${compact ? "px-3 py-4" : "p-5"} ${
              layout === "row" ? "items-start gap-3.5" : "flex-col items-center text-center"
            }`}
          >
            {/* Bare red line icon — the reference cards carry no
                filled chip behind the glyph. */}
            <span
              className={`flex shrink-0 items-center justify-center text-[#EE2B2C] ${
                layout === "stack" ? "mb-2.5" : ""
              }`}
            >
              <Icon
                className={compact ? "h-6 w-6" : "h-7 w-7"}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <div>
              <h3
                className={`font-bold text-neutral-900 ${
                  compact ? "text-[13px] leading-snug" : "text-[15px] leading-snug"
                }`}
              >
                {title}
              </h3>
              <p
                className={`mt-1.5 leading-relaxed text-neutral-500 ${
                  compact ? "text-[11px]" : "text-[13px]"
                }`}
              >
                {description}
              </p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
