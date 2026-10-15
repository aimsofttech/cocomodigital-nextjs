import Link from "next/link";
import type { DesignServiceBlock as Block } from "./designData";
import DesignAddToCallButton from "./DesignAddToCallButton";
import DesignSampleTile from "./DesignSampleTile";
import { BTN_OUTLINE, EYEBROW, FRAME } from "./designTheme";

/**
 * One of the five full-width service blocks: a yellow poster half with the
 * sample strip, and a white half with the pitch, the spec grid and the two
 * buttons. `flip` puts the poster on the right; on phones the poster always
 * comes first because it is first in the DOM.
 */
export default function DesignServiceBlock({ block, flip }: { block: Block; flip: boolean }) {
  const headingId = `design-block-${block.id}-title`;

  return (
    <article
      id={`design-${block.id}`}
      aria-labelledby={headingId}
      className={`${FRAME} grid bg-page md:grid-cols-[1.1fr_1fr]`}
    >
      <div
        className={`flex flex-col justify-between gap-6 bg-brand px-6 py-7 md:min-h-[360px] md:px-10 md:py-11 ${flip ? "md:order-2" : ""}`}
      >
        <div>
          <p className={`${EYEBROW} mb-2.5 text-[#2B1DFF]`}>
            {block.number} · {block.eyebrow}
          </p>
          <h3
            id={headingId}
            className="font-primary text-[36px] leading-[0.95] font-black tracking-[-1.4px] text-strong uppercase md:text-[48px]"
          >
            {block.title[0]}
            <span className="block">{block.title[1]}</span>
          </h3>
        </div>
        <ul
          className={`grid gap-3 ${block.columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}
          aria-label={`${block.title.join(" ")} samples`}
        >
          {block.samples.map((sample, index) => (
            <li key={index} className={`contents`}>
              <DesignSampleTile sample={sample} ratio={block.ratio} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-between gap-5.5 px-6 py-7 md:px-10 md:pt-10 md:pb-8">
        <p className="text-[17px] leading-[1.5] text-body">{block.paragraph}</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm text-strong">
          {block.specs.map((spec) => (
            <div key={spec.label}>
              <dt className="mb-1 text-[11px] font-black tracking-[1.2px] text-strong uppercase">
                {spec.label}
              </dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2.5">
          <Link href={block.explore.href} className={BTN_OUTLINE}>
            {block.explore.label}
            <span aria-hidden="true">↗</span>
          </Link>
          <DesignAddToCallButton item={block.cart} />
        </div>
      </div>
    </article>
  );
}
