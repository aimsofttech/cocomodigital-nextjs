"use client";
import { lazy, Suspense, useRef, useState } from "react";
import type ReactPlayerType from "react-player";
import SecondaryLink from "@/src/components/common/SecondaryLink/SecondaryLink";
import { cleanVideoUrl } from "@/src/lib/videoUrl";
import { DESIGN_HERO } from "./designData";
import { BTN_OUTLINE, EYEBROW, LEAD } from "./designTheme";

/* Same lazy split as HeroBanner: react-player's provider adapters only load
   once the hero is on screen, so the text column paints first. */
const ReactPlayer = lazy(() => import("react-player"));

/**
 * Split hero: copy on the left, the YouTube embed bleeding to the right edge.
 *
 * The player block is a copy of HeroBanner's — muted autoplay, loop, no
 * controls, a mute toggle — so this page's video behaves exactly like the
 * thumbnail page's. HeroBanner itself is not reused because it is shaped for
 * the admin banner (one heading, one button, inside a slider) and has no
 * eyebrow, lead or second button.
 */
export default function DesignHero() {
  const { eyebrow, title, lead, primaryCta, secondaryCta } = DESIGN_HERO;
  const videoUrl = cleanVideoUrl(DESIGN_HERO.videoUrl);
  // Must start muted for autoplay.
  const [isMuted, setIsMuted] = useState(true);
  const playerRef = useRef<ReactPlayerType | null>(null);

  /* YouTube switches captions on by itself for a muted autoplay embed, and
     the cc_load_policy flag alone does not stop it. Unloading the caption
     module through the player API does; it runs on ready and again on play,
     because the player can reload the module when playback starts. */
  const hideCaptions = (player: { getInternalPlayer?: () => unknown }) => {
    const yt = player?.getInternalPlayer?.() as
      | { unloadModule?: (name: string) => void }
      | undefined;
    try {
      yt?.unloadModule?.("captions");
      yt?.unloadModule?.("cc");
    } catch {
      /* Player not ready or not a YouTube player — captions stay as they are. */
    }
  };

  return (
    <section aria-labelledby="design-hero-title" className="w-full bg-page">
      <div className="flex flex-col md:flex-row md:items-stretch">
        {/* Text column. Left gutter grows with the viewport so the copy lines
            up with the 1200px content column below. */}
        <div className="flex w-full flex-col justify-center gap-6 px-5 py-12 md:w-1/2 md:py-20 md:pr-12 md:pl-10 lg:pl-[max(2.5rem,calc((100vw-1200px)/2))]">
          <p className={`${EYEBROW} text-muted`}>{eyebrow}</p>
          <h1
            id="design-hero-title"
            className="font-primary text-[40px] leading-[1.05] font-black tracking-[-1px] text-strong md:text-[60px] md:tracking-[-1.6px]"
          >
            {title.map((line, index) => (
              <span key={line} className={index === 0 ? "" : "block"}>
                {line}
              </span>
            ))}
          </h1>
          <p className={`${LEAD} max-w-[560px]`}>{lead}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3.5">
            <SecondaryLink title={primaryCta.label} path={primaryCta.href} />
            <a href={secondaryCta.href} className={`${BTN_OUTLINE} px-5 py-3.5`}>
              {secondaryCta.label}
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* Video column: black like every hero on the site, ink rule on its
            left edge on desktop, stacked under the copy on phones. */}
        <div className="flex w-full items-center bg-black md:w-1/2 md:border-l-2 md:border-strong">
          {videoUrl ? (
            <div className="relative aspect-video w-full">
              <Suspense
                fallback={<div className="absolute inset-0 bg-black" aria-hidden="true" />}
              >
                <ReactPlayer
                  url={videoUrl}
                  onReady={hideCaptions}
                  onPlay={() => playerRef.current && hideCaptions(playerRef.current)}
                  ref={playerRef}
                  playing
                  loop
                  muted={isMuted}
                  volume={isMuted ? 0 : 1}
                  controls={false}
                  playsinline
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", top: 0, left: 0 }}
                  config={{
                    youtube: {
                      playerVars: {
                        autoplay: 1,
                        modestbranding: 1,
                        controls: 0,
                        showinfo: 0,
                        rel: 0,
                        iv_load_policy: 3,
                        fs: 0,
                        disablekb: 1,
                        /* 3 keeps the caption track off even when the
                           viewer's YouTube preference has captions on. */
                        cc_load_policy: 3,
                      },
                    },
                  }}
                />
              </Suspense>
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="mute-btn"
                aria-label={isMuted ? "Unmute video" : "Mute video"}
                aria-pressed={!isMuted}
              >
                {!isMuted ? "🔊" : "🔇"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
