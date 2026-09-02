import { FiPlay, FiVideo } from "react-icons/fi";
import type { GrowthShowcase } from "@/src/lib/growthServices";
import { optionalIcon } from "./icons";
import { CheckBullet, Heading } from "./Primitives";
import type { HeadingLevel } from "./types";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";

/* Two-up quality panels (audio vs video podcast editing).

   The panels are told apart by surface — brand tint vs soft grey — rather than
   by a second accent hue, so the page keeps a single accent colour. */

const PANEL_TONES: Record<GrowthShowcase["tone"], string> = {
  brand: "bg-brand/15",
  soft: "bg-page-soft",
  page: "bg-page",
};

/* A static waveform. Fixed amplitudes rather than random ones so the server and
   client render identical markup (a random pattern would hydrate mismatched). */
const WAVE_BARS = [
  3, 6, 9, 4, 8, 5, 10, 3, 7, 5, 9, 4, 8, 6, 3, 9, 5, 7, 4, 8, 6, 10, 3, 7, 5, 9, 4, 6, 8, 3,
];

/* Written out in full so Tailwind's scanner sees complete class names. */
const BAR_CLASSES = [
  "h-1", "h-2", "h-3", "h-4", "h-5", "h-6", "h-7", "h-8", "h-9", "h-10", "h-11",
];

function AudioPlayer({ duration }: { duration?: string }) {
  return (
    <>
      <div className="mt-4 flex items-center gap-3 rounded-sticker border-2 border-strong bg-page p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-strong bg-strong text-page">
          <FiPlay className="h-4 w-4 fill-current" aria-hidden="true" />
        </span>
        <span aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
          {WAVE_BARS.map((amplitude, index) => (
            <span
              key={index}
              className={`w-[3px] shrink-0 rounded-full bg-strong/70 ${BAR_CLASSES[amplitude]}`}
            />
          ))}
        </span>
      </div>
      <p className="mt-1.5 flex justify-between px-1 text-[13px] font-bold text-muted">
        <span>00:00</span>
        <span>{duration || ""}</span>
      </p>
    </>
  );
}

function VideoFrame({ timestamp }: { timestamp?: string }) {
  return (
    <div className="relative mt-4 flex aspect-[16/8] items-center justify-center overflow-hidden rounded-sticker border-2 border-strong bg-dark-surface">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-strong bg-brand text-brand-on">
        <FiPlay className="h-4 w-4 fill-current" aria-hidden="true" />
      </span>
      {timestamp ? (
        <span className="absolute bottom-2 left-3 text-xs font-bold text-white/75">
          {timestamp}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className="absolute right-3 bottom-2 flex h-6 w-6 items-center justify-center rounded-sm bg-brand text-brand-on"
      >
        <FiVideo className="h-3 w-3" />
      </span>
    </div>
  );
}

export default function FormatPanels({
  items,
  headingLevel = 3,
}: {
  items: GrowthShowcase[];
  /** Panel titles sit one level under their band heading. */
  headingLevel?: HeadingLevel;
}) {
  if (!items.length) return null;

  // Same reasoning as ShowcaseGrid: the bullet list is a named sub-block.
  const listLevel = Math.min(6, headingLevel + 1) as HeadingLevel;

  return (
    <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
      {items.map((item) => {
        const Watermark = optionalIcon(item.watermarkIcon);
        return (
          <article
            key={item.title}
            className={`relative overflow-hidden rounded-sticker border-2 border-strong p-5 shadow-[4px_4px_0_var(--text-strong,#111)] sm:p-6 ${PANEL_TONES[item.tone]}`}
          >
            {item.editTo ? <EditPencil to={item.editTo} label={item.title} /> : null}
            <Heading level={headingLevel} className="font-satoshi text-xl font-black text-strong sm:text-2xl">
              {item.title}
            </Heading>

            {item.mediaBadge === "play" ? <AudioPlayer duration={item.caption} /> : null}
            {item.mediaBadge === "video" ? <VideoFrame timestamp={item.caption} /> : null}

            {item.points.length ? (
              <>
                <Heading level={listLevel} className="sr-only">
                  What {item.title} includes
                </Heading>
                <ul className="mt-5 space-y-2.5">
                  {item.points.map((point) => (
                    <CheckBullet key={point}>{point}</CheckBullet>
                  ))}
                </ul>
              </>
            ) : null}

            {Watermark ? (
              <Watermark
                aria-hidden="true"
                className="pointer-events-none absolute right-4 bottom-4 h-12 w-12 text-strong/20"
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
