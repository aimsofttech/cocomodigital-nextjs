import { FiMic, FiPlay } from "react-icons/fi";
import type { GrowthService } from "@/src/lib/growthServices";

/* The illustration beside the closing CTA copy. Three variants, chosen per page
   from the admin panel — a play tile, a vertical (9:16) tile, or a mic disc,
   each paired with the rising brand bars. */

type Key = GrowthService["closing"]["illustrationKey"];

/* Rising bars in brand yellow — the accent the dark band is built around. */
function RisingBars({ heights }: { heights: [string, string, string] }) {
  return (
    <span aria-hidden="true" className="flex items-end gap-2">
      <span className={`w-6 rounded-t bg-brand/35 sm:w-8 ${heights[0]}`} />
      <span className={`w-6 rounded-t bg-brand/60 sm:w-8 ${heights[1]}`} />
      <span className={`w-6 rounded-t bg-brand sm:w-8 ${heights[2]}`} />
    </span>
  );
}

export default function ClosingIllustration({ variant }: { variant: Key }) {
  if (variant === "none") return null;

  if (variant === "podcast") {
    return (
      <div className="relative mx-auto flex aspect-[4/3] w-full max-w-md items-end justify-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-28 w-28 items-center justify-center rounded-full bg-brand/15 sm:h-36 sm:w-36"
        >
          <FiMic className="h-14 w-14 text-brand sm:h-20 sm:w-20" />
        </span>
        <RisingBars heights={["h-12 sm:h-16", "h-20 sm:h-28", "h-28 sm:h-40"]} />
      </div>
    );
  }

  if (variant === "social") {
    return (
      <div className="relative mx-auto flex aspect-[4/3] w-full max-w-md items-end justify-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-32 w-24 items-center justify-center rounded-sticker border-4 border-brand/50 bg-brand/15 sm:h-44 sm:w-32"
        >
          <FiPlay className="h-10 w-10 fill-current text-brand sm:h-14 sm:w-14" />
        </span>
        <RisingBars heights={["h-14 sm:h-20", "h-24 sm:h-32", "h-32 sm:h-44"]} />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex aspect-[4/3] w-full max-w-md items-end justify-center gap-4">
      <span
        aria-hidden="true"
        className="flex h-24 w-32 items-center justify-center rounded-sticker border-4 border-brand/50 bg-brand/15 sm:h-32 sm:w-44"
      >
        <FiPlay className="h-12 w-12 fill-current text-brand sm:h-16 sm:w-16" />
      </span>
      <RisingBars heights={["h-16 sm:h-24", "h-24 sm:h-36", "h-32 sm:h-48"]} />
    </div>
  );
}
