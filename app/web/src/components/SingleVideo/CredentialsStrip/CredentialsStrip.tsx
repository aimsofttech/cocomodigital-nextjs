// @ts-nocheck
import React from "react";
import {
  FaFilm,
  FaUserTie,
  FaComments,
  FaGlobe,
  FaLanguage,
} from "react-icons/fa";
import CountUp from "../../common/CountUp/CountUp";
/**
 * <CredentialsStrip />
 *
 * Single-video page credibility block — sits between the
 * "Trusted by" brand grid and the Section12 book-call CTA.
 *
 * Combines two ideas the user asked for ("C+B combo"):
 *
 *   C. Track-record stats — quick scan: "this team has actually
 *      done this work, at scale". Animated count-up so the numbers
 *      register as real, not just decoration.
 *
 *   B. Operational expectation pills — what you GET when you book
 *      a call: turnaround, transparency, free strategy, revisions.
 *      Sets honest expectations and removes "what does this actually
 *      look like" friction before the CTA below.
 *
 * Dark background gives the section the same visual weight as the
 * sticky invite strip above it — they bookend the brand grid as
 * the two "credibility pulses" before the book-call section.
 *
 * Note: numbers are intentionally hardcoded constants (one source of
 * truth at the top of this file). When Anshu adds a `site_stats`
 * singleton on /common-api, swap STATS to a useSelector — the JSX
 * doesn't change.
 */

// Default stats — used when no `stats` prop is passed, which is
// the case for /creatives/:slug and /service/:slug etc.
// where the video-production framing is the right one. Pages
// with a different topical frame (e.g. /work/ip-monetization
// — monetization-flavoured) override these via the `stats` prop.
const DEFAULT_HEADING = "Why teams keep coming back";

const DEFAULT_STATS = [
  { number: 6, suffix: "", label: "Years in business" },
  { number: 60, suffix: "+", label: "In-house team" },
  { number: 50000, suffix: "+", label: "Videos shipped" },
  { number: 1000, suffix: "+", label: "Every month" },
];

// Default operational scale pills — how this team actually works
// at the premium tier. Order groups related claims:
//   1. Speed promise           (Reels in 6 hours)
//   2-3. How you work with us  (PM + chat channels)
//   4-5. Team reach            (timezones + languages)
//
// Earlier drafts had "free 7-day mini-strategy", "2 rounds of
// revisions", and "daily launch reports" — all pulled tone toward
// budget-agency promo language ("free trial", "revision counts",
// vague "reports"). Replaced with operational scale claims that
// say "global production house at premium tier", which matches
// the rest of the page.
//
// Pages with a different topical frame override these via the
// `pills` prop; their data file imports its own icons and pill
// text, this component just renders whatever it's handed.
const DEFAULT_PILLS = [
  { icon: FaFilm, text: "Reels in 6 hours" },
  { icon: FaUserTie, text: "Dedicated project manager" },
  { icon: FaComments, text: "WhatsApp + Slack collaboration" },
  { icon: FaGlobe, text: "US · EU · Asia time zones" },
  { icon: FaLanguage, text: "Multilingual in-house team" },
];

/**
 * Optional props (all backwards-compatible — existing call sites
 * that pass nothing get the original video-production defaults):
 *
 *   heading: string  — section h2 above the stats row
 *   stats:   array   — [{ number, suffix, label }, ...] up to 4
 *                      • undefined / not passed → DEFAULT_STATS render
 *                      • non-empty array         → custom stats render
 *                      • [] empty array OR null  → stats section hidden
 *                        (used by /work/ip-monetization where the hero
 *                        already shows 4 stats and a second stats row
 *                        would read as duplication)
 *   pills:   array   — [{ icon: ReactIcon, text }, ...] up to 5
 */
export default function CredentialsStrip({ heading, stats, pills }) {
  const _heading = heading || DEFAULT_HEADING;
  /* Distinguish "not passed" (undefined → defaults) from
     "explicitly opted-out" (null or [] → hide). The previous
     `stats?.length ? stats : DEFAULT_STATS` collapsed both
     cases to the defaults, so callers couldn't render a
     pills-only strip. */
  const statsOptedOut = stats === null || (Array.isArray(stats) && stats.length === 0);
  const _stats = stats?.length ? stats : (statsOptedOut ? [] : DEFAULT_STATS);
  const _pills = pills?.length ? pills : DEFAULT_PILLS;
  const showStats = _stats.length > 0;
  return (
    <section
      className="credentials-strip"
      aria-labelledby="credentials-heading"
    >
      <div className="credentials-inner">
        {/* Promoted from eyebrow → h2 heading. "Why teams keep
            coming back" is too long to render uppercase as an
            eyebrow without feeling shouty; sentence-case at h3
            scale reads as a confident section heading and pairs
            cleanly with the big yellow stats below. */}
        <h2 className="credentials-heading" id="credentials-heading">
          {_heading}
        </h2>

        {/* Stats row — animated count-up numbers in brand yellow,
            label in soft white below. 4-col desktop, 2x2 mobile.
            Hidden entirely when caller opts out via stats={[]} or
            stats={null} — divider goes with it so the heading
            sits directly above the pills. */}
        {showStats && (
          <>
            <div className="credentials-stats" role="list">
              {_stats.map((stat, idx) => (
                <div className="credentials-stat" role="listitem" key={idx}>
                  <div className="credentials-stat-num">
                    {/* className passed through to CountUp's inline
                        span so the marker-pen yellow swipe wraps
                        exactly the digits + suffix, not the column. */}
                    <CountUp
                      className="credentials-stat-num-text"
                      end={stat.number}
                      duration={1800}
                      suffix={stat.suffix}
                    />
                  </div>
                  <div className="credentials-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Dashed divider — picks up the same dashed border-bottom
                language used on the InviteForService strip. */}
            <div className="credentials-divider" aria-hidden="true" />
          </>
        )}

        {/* Expectation pills — outline-style tags on dark bg. Yellow
            icon + white text + thin white border. Reads as "operational
            promise" not "decorative chip". */}
        <ul className="credentials-pills">
          {_pills.map((item, idx) => {
            const Icon = item.icon;
            return (
              <li className="credentials-pill" key={idx}>
                <span className="credentials-pill-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="credentials-pill-text">{item.text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
