// @ts-nocheck
"use client";
import React, { useEffect, useRef, useState } from "react";

export default function CountUp({
  end,
  duration = 1600,
  startOnMount = false,
  prefix = "",
  suffix = "",
  className,
  formatter,
}) {
  const target = Number(end);
  const isValid = Number.isFinite(target);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Under prefers-reduced-motion we run the animation at half the
  // requested duration — long enough to read as an animation, not
  // a flash to the final value, but noticeably faster than the
  // full sweep. (Old code capped at 800ms total which meant the
  // caller couldn't request a longer count-up even when intentional.)
  const effectiveDuration = reducedMotion ? duration * 0.5 : duration;

  const [value, setValue] = useState(!isValid ? target : 0);
  const ref = useRef(null);

  useEffect(() => {
    if (!isValid) return;

    // Closure-local cancel flag so React Strict Mode (dev) double-
    // invocation of effects works correctly: the first run's
    // cleanup cancels its own RAF chain, the second run starts a
    // fresh chain. We deliberately do NOT keep a "has already run"
    // flag — that would make the second mount in Strict Mode
    // skip animation entirely.
    let rafId = null;
    let cancelled = false;

    const animate = () => {
      const startTs = performance.now();
      const tick = (now) => {
        if (cancelled) return;
        const elapsed = now - startTs;
        const progress = Math.min(elapsed / effectiveDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setValue(target);
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    // Trigger immediately if requested OR if IO isn't available.
    if (startOnMount || !("IntersectionObserver" in window)) {
      animate();
      return () => {
        cancelled = true;
        if (rafId) cancelAnimationFrame(rafId);
      };
    }

    const el = ref.current;
    if (!el) {
      animate();
      return () => {
        cancelled = true;
        if (rafId) cancelAnimationFrame(rafId);
      };
    }

    // IO mode — disconnect after first intersection so scrolling
    // away and back doesn't re-trigger the count-up.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [target, effectiveDuration, isValid, startOnMount]);

  if (!isValid) {
    return (
      <span ref={ref} className={className}>
        {prefix}
        {end}
        {suffix}
      </span>
    );
  }

  const display = formatter ? formatter(value) : value.toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
