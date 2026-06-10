// @ts-nocheck
import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "@/src/lib/navigation";
import { FaArrowRight } from "react-icons/fa";
/** Anil's portrait — same image used by ContactPromo and the
 *  ScheduleMeeting host card, so caches share. */
const FOUNDER_PORTRAIT_URL =
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png";

/**
 * Single-video page top strip — Option C "action-only banner"
 * with auto-rolling last-month timestamp.
 *
 * The {month} + {year} auto-update on the 1st of every month
 * (computed from `new Date()`), so admin doesn't have to touch
 * the copy 11 of 12 months. Only the count below needs a manual
 * update — should be a 1-line constant edit per month, or a
 * single backend field once Anshu adds one (TODO below).
 *
 * The `authorId` prop is preserved (still passed by the parent)
 * but no longer used — kept for backward compat in case future
 * variants want to bring author info back via a different
 * treatment.
 */

/**
 * Manual update each month — replace the number with the actual
 * count of videos delivered last month. Update on the 1st.
 *
 * TODO (Anshu): expose this as a `videos_shipped_last_month`
 * field on a `site_stats` singleton via `/common-api`. Frontend
 * swap is one line: replace this constant with a useSelector /
 * fetch, keep the rest of the rendering identical.
 */
const LAST_MONTH_VIDEO_COUNT = 700;

/** Returns "April 2026"-style label for the previous calendar
 *  month, with correct year rollback in January. */
function lastMonthLabel(now = new Date()) {
  const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthName = ref.toLocaleString("en-US", { month: "long" });
  return `${monthName} ${ref.getFullYear()}`;
}

 
export default function InviteForService({ authorId }) {
  const monthYear = useMemo(() => lastMonthLabel(), []);
  const sentinelRef = useRef(null);

  useEffect(() => {
    // Sentinel sits 1px above the strip in the DOM. We check its
    // bounding rect on every scroll: if the sentinel has scrolled
    // ABOVE the viewport top (rect.top < 0) the strip is stuck,
    // and we hide the main header so the strip becomes the top bar.
    //
    // (IntersectionObserver was tried first but doesn't fire on
    // fast scroll-back-up — the sentinel goes from "not intersecting
    // above" to "not intersecting below" without crossing threshold,
    // so the observer never sees the un-stuck transition. A simple
    // passive scroll listener is more reliable here.)
    const el = sentinelRef.current;
    if (!el) return;

    const checkStuck = () => {
      const rect = el.getBoundingClientRect();
      const isStuck = rect.top < 0;
      document.body.classList.toggle("sv-strip-stuck", isStuck);
    };

    checkStuck(); // initial state
    window.addEventListener("scroll", checkStuck, { passive: true });
    window.addEventListener("resize", checkStuck, { passive: true });

    return () => {
      window.removeEventListener("scroll", checkStuck);
      window.removeEventListener("resize", checkStuck);
      document.body.classList.remove("sv-strip-stuck");
    };
  }, []);

  return (
    <>
      {/* Sentinel — intersection target. Detects "strip is stuck"
          state without expensive scroll listeners. */}
      <div
        ref={sentinelRef}
        className="invite-for-edit-sentinel"
        aria-hidden="true"
      />
      <div className="invite-for-edit-main-wrapper">
        <div className="invite-for-edit-main">
          <div className="invite-banner">
            {/* Anil's avatar replaces the abstract film icon —
                personal anchor without the "blogger greeting" feel.
                Hidden on mobile (CSS) so the strip stays compact. */}
            <span className="invite-banner-icon" aria-hidden="true">
              <img
                src={FOUNDER_PORTRAIT_URL}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </span>
            <p className="invite-banner-copy">
              Like this? In{" "}
              <strong className="invite-banner-month">{monthYear}</strong>{" "}
              alone, we shipped{" "}
              <span className="invite-banner-stat">
                {LAST_MONTH_VIDEO_COUNT}+
              </span>{" "}
              videos across films, web series, music and brand campaigns.
            </p>
            <Link to="/ScheduleMeeting" className="invite-banner-cta">
              <span>Book a 15-min call</span>
              <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
