"use client";

import { useState } from "react";
import Image from "next/image";
import { FaPlay } from "react-icons/fa";
import type { PodcastHeroMediaData } from "@/src/lib/podcast";

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
 * TWO KINDS OF VIDEO. `videoId` is a YouTube id and goes through the facade
 * above. `videoSrc` is a file the browser can play itself — an upload the
 * admin put on S3, or any non-YouTube URL an editor pasted — and gets a plain
 * <video>. The API resolves the editor's upload and URL into exactly one of
 * the two, so this component never has to choose between them.
 *
 * With neither set, this renders as a plain photograph — deliberately no play
 * button, because a control that does nothing is worse than no control. Set a
 * video in the admin panel (Podcast → Pages) to switch it on.
 */
export default function PodcastHeroMedia({
  media,
  priority = true,
  sizes = "(max-width: 1100px) min(100vw, 520px), 46vw",
  className = "",
}: {
  media: PodcastHeroMediaData;
  /**
   * Preload the poster. TRUE ONLY FOR THE HERO — it is the LCP element, and
   * a second priority image on the same page competes with it for the early
   * bandwidth rather than helping anything. The wrong-call band renders this
   * same component several screens down and passes false.
   */
  priority?: boolean;
  /** The width this frame actually occupies, so the browser picks the right
   *  source. The default describes the hero's column, not every column. */
  sizes?: string;
  /** Extra class on the frame, for a host that needs to vary the treatment. */
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const { videoId, videoSrc, poster, alt, playLabel } = media;

  /* Either kind of video earns a play button. The API guarantees at most one
     of the two is set, so this is a presence test, not a preference. */
  const hasVideo = Boolean(videoId || videoSrc);

  /* The control has to be named whether or not anyone typed a name for it.
     The hero still carries an editor-written label; the wrong-call band has
     no such field any more, so an empty string would leave a button and an
     iframe with no accessible name at all — a screen reader would announce
     "button", and nothing else. */
  const controlName = playLabel || "Play the video";

  /* An uploaded file, or any non-YouTube URL an editor pasted. Played by the
     browser itself — no third-party player, and the poster keeps showing
     until the first frame decodes rather than flashing black.

     `autoPlay` is safe here only because it is paired with `playsInline` and
     the element is mounted BY the click: a user gesture started it, so a
     browser's autoplay policy has nothing to block. There is no `preload`
     because the element does not exist until that click — nothing is fetched
     against the page's budget beforehand. */
  if (videoSrc && playing) {
    return (
      <div className={`pod-media pod-media--playing${className ? ` ${className}` : ""}`}>
        <video
          className="pod-media-frame"
          src={videoSrc}
          poster={poster || undefined}
          controls
          autoPlay
          playsInline
          aria-label={controlName}
        />
      </div>
    );
  }

  if (videoId && playing) {
    return (
      <div className={`pod-media pod-media--playing${className ? ` ${className}` : ""}`}>
        <iframe
          className="pod-media-frame"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={controlName}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  /* A file with no still. The browser draws its own first frame, so there is
     nothing to fake and no facade to build — the real player goes straight in.
     `preload="metadata"` fetches the headers and that first frame and stops,
     which is a few tens of kilobytes rather than the whole clip. */
  if (videoSrc) {
    return (
      <div className={`pod-media pod-media--playing${className ? ` ${className}` : ""}`}>
        <video
          className="pod-media-frame"
          src={videoSrc}
          controls
          preload="metadata"
          playsInline
          aria-label={controlName}
        />
      </div>
    );
  }

  /* No still and nothing to derive one from — render the frame without an
     image rather than an <img> with an empty src, which would draw a
     broken-image glyph. */
  if (!poster) return <figure className={`pod-media${className ? ` ${className}` : ""}`} />;

  /* A still that came from YouTube rather than from the admin.
     next/image would reject it — i.ytimg.com is not in remotePatterns — and
     adding it there to run a CDN thumbnail through the optimiser buys
     nothing: it is already small and already on a CDN. A plain <img> is the
     honest call for a third-party frame; uploaded posters keep next/image. */
  const isDerived = /^https:\/\/i\.ytimg\.com\//.test(poster);

  const poster_ = isDerived ? (
    <img
      src={poster}
      alt={alt}
      width={1200}
      height={643}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className="pod-media-img"
    />
  ) : (
    <Image
      src={poster}
      alt={alt}
      width={1200}
      height={643}
      priority={priority}
      sizes={sizes}
      className="pod-media-img"
    />
  );

  if (!hasVideo) {
    return <figure className={`pod-media${className ? ` ${className}` : ""}`}>{poster_}</figure>;
  }

  return (
    <button
      type="button"
      className={`pod-media pod-media--button${className ? ` ${className}` : ""}`}
      onClick={() => setPlaying(true)}
      aria-label={controlName}
    >
      {poster_}
      <span className="pod-media-play" aria-hidden="true">
        <FaPlay />
      </span>
      {/* The visible cue is the editor's own words, so it is drawn only when
          there are some. The accessible name above always exists. */}
      {playLabel && (
        <span className="pod-media-cue" aria-hidden="true">
          {playLabel}
        </span>
      )}
    </button>
  );
}
