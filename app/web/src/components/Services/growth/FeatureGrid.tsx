import type { FeatureItem } from "./types";
import { CARD_FLAT, ICON_CHIP } from "./theme";

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

const CARD_BASE = CARD_FLAT;

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
            {/* Brand chip behind a near-black glyph. Yellow can't carry a
                thin icon on white (~1.1:1), so it becomes the surface and
                the glyph stays near-black. */}
            <span
              className={`${ICON_CHIP} ${compact ? "h-9 w-9" : "h-11 w-11"} ${
                layout === "stack" ? "mb-3" : ""
              }`}
            >
              <Icon
                className={compact ? "h-4.5 w-4.5" : "h-5.5 w-5.5"}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            <div>
              <h3
                className={`font-black text-strong ${
                  compact ? "text-[13px] leading-snug" : "text-[15px] leading-snug"
                }`}
              >
                {title}
              </h3>
              <p
                className={`mt-1.5 leading-relaxed text-muted ${
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
