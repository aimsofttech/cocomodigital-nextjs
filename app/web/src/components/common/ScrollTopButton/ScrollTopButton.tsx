"use client";

import { useEffect, useState } from "react";

/**
 * ScrollTopButton — the "back to top" arrow in the bottom-right corner.
 *
 * Mounted once in SiteShell, so it is on every public page and on none of
 * the shells that opt out of the marketing chrome (/studio, /content-api).
 *
 * The button is always in the DOM and toggles a class rather than mounting
 * and unmounting: an element that is removed cannot animate on its way out,
 * and a "back to top" control that vanishes the instant you scroll up reads
 * as a glitch. CSS handles the fade both ways; see `.scroll-top` in
 * globals.css.
 */

/* Roughly half a laptop viewport. Low enough that the button is there when
   you want it, high enough that it never appears on a page whose content
   ends before you have scrolled anywhere worth returning from. */
const SHOW_AFTER_PX = 400;

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    /* Coalesced into a frame: scroll fires far faster than the browser
       paints, and this only ever flips one boolean. Without the guard a
       fast flick queues hundreds of identical setState calls. */
    let frame = 0;

    const read = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    /* Once up front: a reload can restore a scroll position deep in the
       page, and no scroll event fires for that. */
    read();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    /* Checked here rather than in CSS because scroll behaviour is a
       scripted argument, not a style — someone who has asked for less
       motion should not be flown up 8000px. */
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      className={visible ? "scroll-top is-visible" : "scroll-top"}
      aria-label="Scroll back to top"
      title="Back to top"
      /* visibility:hidden already takes it out of the tab order; this
         repeats it in the markup so the button is never a focus trap in
         an empty corner if the stylesheet has not applied yet. */
      tabIndex={visible ? 0 : -1}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 19V6" />
        <path d="M5.5 12.5 12 6l6.5 6.5" />
      </svg>
    </button>
  );
}
