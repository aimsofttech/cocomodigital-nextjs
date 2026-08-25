"use client";

import { useState } from "react";
import Image from "next/image";
import { FaPlay } from "react-icons/fa";
import { HERO_MEDIA } from "./podcastGrowthData";

/**
 * Hero media: a real Cocoma recording still, ready to become the pitch
 * video the moment there is one.
 *
 * Click-to-play facade rather than an embedded iframe. A YouTube embed
 * pulls roughly a megabyte of player before anyone asks for it, which
 * would wreck the LCP budget on the one screen that has to load fast.
 * Here the poster is the only thing that loads; the iframe is mounted
 * on click, already carrying autoplay so the click that reveals it also
 * starts it.
 *
 * With no videoId set, this renders as a plain photograph — deliberately
 * no play button, because a control that does nothing is worse than no
 * control. Set HERO_MEDIA.videoId in podcastGrowthData to switch it on.
 */
export default function PodcastHeroMedia() {
  const [playing, setPlaying] = useState(false);
  const { videoId, poster, alt, playLabel } = HERO_MEDIA;

  if (videoId && playing) {
    return (
      <div className="pod-media pod-media--playing">
        <iframe
          className="pod-media-frame"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={playLabel}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const poster_ = (
    <Image
      src={poster}
      alt={alt}
      width={1200}
      height={643}
      priority
      sizes="(max-width: 1100px) min(100vw, 520px), 46vw"
      className="pod-media-img"
    />
  );

  if (!videoId) {
    return <figure className="pod-media">{poster_}</figure>;
  }

  return (
    <button
      type="button"
      className="pod-media pod-media--button"
      onClick={() => setPlaying(true)}
      aria-label={playLabel}
    >
      {poster_}
      <span className="pod-media-play" aria-hidden="true">
        <FaPlay />
      </span>
      <span className="pod-media-cue" aria-hidden="true">
        {playLabel}
      </span>
    </button>
  );
}
