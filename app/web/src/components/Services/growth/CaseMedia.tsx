import { FiMic, FiPlay } from "react-icons/fi";
import { FaYoutube } from "react-icons/fa6";
import type { GrowthService } from "@/src/lib/growthServices";

/* The picture half of the case-study band: a dark card carrying the client or
   show name in two lines, one of which takes the brand colour. Brand yellow
   reads at ~15:1 on this surface — the one context where it can carry type
   directly. Which line is accented, the optional subtitle and the corner badge
   are all admin-controlled. */

type Media = GrowthService["caseStudy"]["media"];

function Badge({ badge }: { badge: Media["badge"] }) {
  if (badge === "youtube") {
    return (
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-sm bg-brand px-2 py-1 text-[10px] font-black text-brand-on uppercase"
      >
        <FaYoutube className="h-3 w-3" />
        Subscribe
      </span>
    );
  }
  if (badge === "play") {
    return (
      <span
        aria-hidden="true"
        className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-strong bg-brand text-brand-on"
      >
        <FiPlay className="h-3.5 w-3.5 fill-current" />
      </span>
    );
  }
  if (badge === "mic") {
    return (
      <FiMic aria-hidden="true" className="absolute right-3 bottom-3 h-8 w-8 text-brand/40" />
    );
  }
  return null;
}

export default function CaseMedia({ media }: { media: Media }) {
  const { lineOne, lineTwo, accentLine, subtitle, badge } = media;

  // The first line inherits the block colour, so only the second needs its own.
  const firstClass = accentLine === "one" ? "text-brand" : "text-white";
  const secondClass = accentLine === "two" ? "text-brand" : "text-white";

  return (
    <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-sticker border-2 border-strong bg-dark-surface p-5">
      <p
        className={`text-center font-satoshi text-xl leading-tight font-black tracking-tight uppercase sm:text-2xl ${firstClass}`}
      >
        {lineOne}
        {lineTwo ? <span className={`block ${secondClass}`}>{lineTwo}</span> : null}
        {subtitle ? (
          <span className="mt-1 block text-[10px] font-medium tracking-normal text-white/60 normal-case">
            {subtitle}
          </span>
        ) : null}
      </p>
      <Badge badge={badge} />
    </div>
  );
}
