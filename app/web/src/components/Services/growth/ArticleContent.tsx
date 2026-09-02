import type { GrowthContentBlock } from "@/src/lib/growthServices";
import { CheckBullet, Heading } from "./Primitives";
import type { HeadingLevel } from "./types";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";

/* The long-form supporting copy under a band — the part of the page written
   for someone comparing agencies, and the part a search engine has enough of
   to understand what the service actually covers.

   Each block is a heading plus its paragraphs, and each block carries its own
   level (3-6, authored in the admin panel) so one band can hold a real nested
   outline instead of a run of sibling headings. Type size steps down with the
   level, so the visual hierarchy matches the semantic one.

   Indentation only kicks in from level 5, where the nesting is deep enough
   that the size difference alone stops carrying it. */

const HEADING_CLASSES: Record<HeadingLevel, string> = {
  1: "font-satoshi text-3xl font-black tracking-tight text-strong sm:text-4xl",
  2: "font-satoshi text-2xl font-black tracking-tight text-strong sm:text-3xl",
  3: "font-satoshi text-xl font-black tracking-tight text-strong sm:text-2xl",
  4: "font-satoshi text-lg font-black text-strong sm:text-xl",
  5: "font-satoshi text-base font-black text-strong sm:text-lg",
  6: "text-[15px] font-black tracking-wide text-strong uppercase sm:text-base",
};

const BLOCK_SPACING: Record<HeadingLevel, string> = {
  1: "mt-10",
  2: "mt-10",
  3: "mt-10 first:mt-0",
  4: "mt-8",
  5: "mt-6 border-l-2 border-strong/12 pl-4",
  6: "mt-5 border-l-2 border-strong/12 pl-4",
};

export default function ArticleContent({ blocks }: { blocks: GrowthContentBlock[] }) {
  if (!blocks.length) return null;

  return (
    /* max-w-3xl keeps the measure near 70 characters. Long-form copy set to the
       full 1440px content width would be unreadable. */
    <div className="mx-auto mt-8 w-full max-w-3xl">
      {blocks.map((block, index) => {
        const level = (Math.min(6, Math.max(3, block.level)) || 3) as HeadingLevel;
        return (
          <section
            key={`${block.heading}-${index}`}
            className={`${BLOCK_SPACING[level]} edit-host`}
          >
            {block.editTo ? (
              <EditPencil to={block.editTo} label={block.heading || "this block"} />
            ) : null}
            {block.heading ? (
              <Heading level={level} className={HEADING_CLASSES[level]}>
                {block.heading}
              </Heading>
            ) : null}

            {block.body.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base"
              >
                {paragraph}
              </p>
            ))}

            {block.bullets.length ? (
              <ul className="mt-4 space-y-2.5">
                {block.bullets.map((bullet) => (
                  <CheckBullet key={bullet}>{bullet}</CheckBullet>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
