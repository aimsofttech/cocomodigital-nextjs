"use client";

import { useEffect, useRef, useState } from "react";

/* Stat tiles are admin-managed (admin panel → Home → Growth at a
   glance → Stats) and passed in via the `stats` prop:
   { prefix, value, suffix, label } — rendered as
   `${prefix}${value}${suffix}` with a count-up animation. */

export interface StatItem {
  id?: string;
  prefix: string;
  value: number;
  suffix: string;
  label: string;
}

const TILT_ANGLES = [-1.5, 1, -1, 1.5, -1];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const ANIMATION_MS = 2200;
const FALLBACK_TRIGGER_MS = 4000;

const formatStat = (item: StatItem, n: number): string =>
  `${item.prefix}${n}${item.suffix}`;

const StatsSection = ({ stats = [] }: { stats?: StatItem[] }) => {
  const sectionRef = useRef<HTMLElement | null>(null);

  const numberRefs = useRef<(HTMLHeadingElement | null)[]>([]);

  const [animationDone, setAnimationDone] = useState(false);

  /* Stable primitive signature of the stats. Depending on this (instead of
     the array reference) keeps the effect's dependency list a constant
     size and stops the count-up restarting when a parent re-render passes
     a new array with the same contents. */
  const statsKey = stats
    .map((s) => `${s.prefix}|${s.value}|${s.suffix}|${s.label}`)
    .join(',');

  useEffect(() => {
    if (!stats.length) return;

    let started = false;
    let cancelled = false;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      stats.forEach((s, i) => {
        const node = numberRefs.current[i];

        if (node) {
          node.textContent = formatStat(s, s.value);
        }
      });

      setAnimationDone(true);
      return;
    }

    const runCountUp = () => {
      if (started || cancelled) return;

      started = true;

      const startTime = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;

        const progress = Math.min(
          (now - startTime) / ANIMATION_MS,
          1
        );

        const eased = easeOutCubic(progress);

        stats.forEach((s, i) => {
          const node = numberRefs.current[i];

          if (!node) return;

          node.textContent = formatStat(
            s,
            Math.round(s.value * eased)
          );
        });

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          setAnimationDone(true);
        }
      };

      requestAnimationFrame(tick);
    };

    const checkVisible = () => {
      if (started) return;

      const el = sectionRef.current;

      if (!el) return;

      const rect = el.getBoundingClientRect();

      const vh = window.innerHeight || 800;

      if (rect.top < vh * 0.75 && rect.bottom > 0) {
        runCountUp();

        window.removeEventListener("scroll", checkVisible);
      }
    };

    checkVisible();

    if (!started) {
      window.addEventListener("scroll", checkVisible, {
        passive: true,
      });
    }

    const fallbackTimer = setTimeout(() => {
      if (!started) {
        runCountUp();
      }
    }, FALLBACK_TRIGGER_MS);

    return () => {
      cancelled = true;

      clearTimeout(fallbackTimer);

      window.removeEventListener("scroll", checkVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsKey]);

  if (!stats.length) return null;

  return (
    <section className="stats-section-wrapper" ref={sectionRef}>
      <div className="stats-section-main">
        <div className="stats-container">
          {stats.map((item, index) => (
            <div
              key={item.id || item.label}
              className="stat-card"
              style={
                {
                  "--stat-tilt": `${TILT_ANGLES[index % TILT_ANGLES.length] || 0
                    }deg`,
                } as React.CSSProperties
              }
            >
              <h2
                className="stat-number font-primary"
                ref={(el) => {
                  numberRefs.current[index] = el;
                }}
              >
                {formatStat(
                  item,
                  animationDone ? item.value : 0
                )}
              </h2>

              <p className="stat-label">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
