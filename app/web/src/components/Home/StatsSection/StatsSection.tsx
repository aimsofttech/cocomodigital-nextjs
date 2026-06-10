"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  { prefix: "", value: 45, suffix: "M+", label: "Subscribers Built" },
  { prefix: "", value: 12, suffix: "B+", label: "Organic Views" },
  { prefix: "$", value: 600, suffix: "K+", label: "Ad Revenue · 2025" },
  { prefix: "", value: 35, suffix: "K+", label: "Videos Produced" },
  { prefix: "", value: 70, suffix: "%", label: "Partnerships Recurring" },
];

const TILT_ANGLES = [-1.5, 1, -1, 1.5, -1];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const ANIMATION_MS = 2200;
const FALLBACK_TRIGGER_MS = 4000;

const formatStat = (
  item: (typeof stats)[number],
  n: number
): string => `${item.prefix}${n}${item.suffix}`;

const StatsSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);

  const numberRefs = useRef<(HTMLHeadingElement | null)[]>([]);

  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
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
  }, []);

  return (
    <section className="stats-section-wrapper" ref={sectionRef}>
      <div className="stats-section-main">
        <div className="stats-container">
          {stats.map((item, index) => (
            <div
              key={item.label}
              className="stat-card"
              style={
                {
                  "--stat-tilt": `${TILT_ANGLES[index] || 0
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