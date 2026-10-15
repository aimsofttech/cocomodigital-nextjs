import Image from "next/image";
import type { CSSProperties } from "react";
import type { DesignSample } from "./designData";
import { FRAME } from "./designTheme";

/**
 * One tile in a service block's sample strip.
 *
 * Images fill a fixed-ratio frame with object-fit: cover, so a 4:5 poster
 * sits in a 2:3 frame without the strip reflowing when Kirk swaps the final
 * crops in. A video shows its opening frame only — preload="metadata", no
 * autoplay, no controls — because the strip is a gallery, not a player. The
 * placeholder is the mockup's grey tile for blocks with no artwork yet.
 */
export default function DesignSampleTile({
  sample,
  ratio,
}: {
  sample: DesignSample;
  /** The block's ratio; a tile may override it. */
  ratio: string;
}) {
  const style: CSSProperties = { aspectRatio: sample.ratio ?? ratio };
  const span = sample.span === 2 ? "col-span-2" : "";

  if (sample.kind === "placeholder") {
    return (
      <div
        style={style}
        className={`${FRAME} ${span} flex flex-col items-center justify-center bg-page-tint p-2 text-center text-xs font-bold tracking-[0.8px] text-strong uppercase`}
      >
        {sample.label}
        {sample.sublabel ? (
          <span className="mt-1.5 block text-xs font-medium tracking-normal normal-case text-muted">
            {sample.sublabel}
          </span>
        ) : null}
      </div>
    );
  }

  if (sample.kind === "video") {
    return (
      <div style={style} className={`${FRAME} ${span} relative bg-black`}>
        {/* The #t fragment seeks to a frame, which is what makes Chrome paint
            one at all (metadata alone leaves the box black). One second in,
            because ad cuts tend to open on black. */}
        <video
          src={`${sample.src}#t=1`}
          muted
          playsInline
          preload="metadata"
          aria-label={sample.alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div style={style} className={`${FRAME} ${span} relative bg-page`}>
      <Image
        src={sample.src}
        alt={sample.alt}
        fill
        sizes="(max-width: 768px) 45vw, 320px"
        className="object-cover"
      />
    </div>
  );
}
