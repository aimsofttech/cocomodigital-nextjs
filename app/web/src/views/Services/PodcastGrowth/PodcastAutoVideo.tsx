"use client";

import { useEffect, useRef, useState } from "react";
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import type { PodcastHeroMediaData } from "@/src/lib/podcast";

/**
 * A video that starts itself, with a mute toggle.
 *
 * Separate from PodcastHeroMedia rather than a flag on it. The hero is a
 * click-to-play facade — it deliberately loads nothing until asked, because it
 * sits in the LCP window. This one does the opposite, and folding both into
 * one component would mean every branch in it answering "which am I today?".
 *
 * ── Three things this has to get right ────────────────────────────────────
 *
 * MUTED, OR IT WILL NOT START. Every browser blocks autoplay with sound; the
 * play() promise rejects and the frame sits on its first frame looking broken.
 * So it starts muted and the toggle is how sound gets turned on — a real user
 * gesture, which is exactly what the policy wants.
 *
 * NOT UNTIL IT IS ON SCREEN. This band is several screens down. Autoplaying on
 * load would pull the whole clip for every visitor, including the majority who
 * never scroll to it. An IntersectionObserver mounts the player when the band
 * comes near the viewport, so the bytes are spent on people who will see it.
 *
 * NOT AT ALL IF THEY ASKED FOR STILLNESS. `prefers-reduced-motion` gets a
 * paused player with its controls, not a moving picture. Autoplaying video is
 * among the things that setting exists to stop.
 *
 * IT LOOPS. `loop` on the element; on YouTube, `loop=1` alone does nothing
 * for a single video and has to be paired with `playlist=<same id>`, which is
 * their long-standing quirk rather than a mistake here.
 *
 * Native controls stay on in every case. Anything that plays on its own for
 * more than five seconds needs a way to stop it (WCAG 2.2.2) — and a clip
 * that never ends on its own makes that more important, not less. The
 * browser's own controls are a better answer than anything hand-rolled.
 */
export default function PodcastAutoVideo({
  media,
  className = "",
}: {
  media: PodcastHeroMediaData;
  className?: string;
}) {
  const { videoId, videoSrc, poster } = media;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [muted, setMuted] = useState(true);

  /* Read once on mount rather than in render: the server has no matchMedia,
     and starting from `false` keeps the first client render agreeing with the
     server's. */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    /* No observer (a very old browser, or a test environment) — mount it
       rather than leaving a permanently empty frame. */
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setInView(true);
        /* One-shot. Scrolling back past it should not restart anything the
           viewer has since paused. */
        observer.disconnect();
      },
      /* A little ahead of the fold, so it has started by the time it is
         actually looked at rather than beginning as it lands. */
      { rootMargin: "200px" },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!inView || reduced || !video) return;

    /* Set on the element as well as in the attribute: React writes `muted` as
       a property on mount, but a re-render can land after the browser has
       already decided, and an unmuted element here is one that never plays. */
    video.muted = true;

    const started = video.play();
    /* A rejected play() is a policy decision, not a fault — the viewer gets a
       paused player with controls, which is a fine outcome and not worth an
       error in their console. */
    if (started) started.catch(() => undefined);
  }, [inView, reduced]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);

    if (videoRef.current) videoRef.current.muted = next;

    /* YouTube takes commands over postMessage when the embed is built with
       enablejsapi=1 — no need to pull in their 200KB iframe-API script for
       two commands. */
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
      "*",
    );
  };

  const muteButton = (
    <button
      type="button"
      className="pod-media-mute"
      onClick={toggleMute}
      aria-pressed={muted}
      aria-label={muted ? "Unmute video" : "Mute video"}
      title={muted ? "Unmute" : "Mute"}
    >
      {muted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
    </button>
  );

  /* ── A file: an upload, or any non-YouTube URL ─────────────────────── */
  if (videoSrc) {
    return (
      <div
        ref={hostRef}
        className={`pod-media pod-media--playing${className ? ` ${className}` : ""}`}
      >
        <video
          ref={videoRef}
          className="pod-media-frame"
          src={videoSrc}
          poster={poster || undefined}
          controls
          muted={muted}
          loop
          playsInline
          /* "none" until it is worth loading: the observer flips this, and the
             browser then fetches only what it needs to start. */
          preload={inView ? "auto" : "none"}
          aria-label="Video"
        />
        {muteButton}
      </div>
    );
  }

  /* ── YouTube ───────────────────────────────────────────────────────── */
  if (videoId) {
    return (
      <div
        ref={hostRef}
        className={`pod-media pod-media--playing${className ? ` ${className}` : ""}`}
      >
        {inView && !reduced ? (
          <>
            <iframe
              ref={frameRef}
              className="pod-media-frame"
              src={
                `https://www.youtube-nocookie.com/embed/${videoId}` +
                `?autoplay=1&mute=1&loop=1&playlist=${videoId}` +
                `&enablejsapi=1&playsinline=1&rel=0&modestbranding=1`
              }
              title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {muteButton}
          </>
        ) : (
          /* Before it is in view — and permanently, for a reduced-motion
             viewer — the derived thumbnail holds the frame so the column is
             never an empty box. A plain <img>: this is i.ytimg.com, which
             next/image is not configured for and would gain nothing from. */
          <img
            src={poster || undefined}
            alt=""
            className="pod-media-img"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    );
  }

  return null;
}
