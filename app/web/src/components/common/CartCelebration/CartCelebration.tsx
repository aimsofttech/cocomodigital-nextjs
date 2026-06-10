"use client";
import { useEffect, useRef, useState } from "react";
import { useCartCount } from "@/src/lib/cart";
import { FaCheck } from "react-icons/fa";
import confetti from "canvas-confetti";

const CELEBRATION_DURATION_MS = 2800;

const BRAND_COLORS = ["#FFF000", "#FFD700", "#111111", "#FFFAC0"];

interface CelebrationState {
  id: number;
  count: number;
}

function fireConfetti() {
  const defaults = {
    spread: 75,
    ticks: 110,
    gravity: 0.9,
    decay: 0.94,
    startVelocity: 38,
    colors: BRAND_COLORS,
    scalar: 1.25,
    shapes: ["square", "circle"],
    zIndex: 9999,
    disableForReducedMotion: false,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(160 * particleRatio),
    });
  }

  fire(0.25, {
    angle: 60,
    origin: { x: 0.05, y: 0.85 },
  });

  fire(0.25, {
    angle: 120,
    origin: { x: 0.95, y: 0.85 },
  });

  fire(0.35, {
    angle: 90,
    spread: 100,
    startVelocity: 50,
    origin: { x: 0.5, y: 0.6 },
  });

  fire(0.15, {
    angle: 60,
    origin: { x: 0.05, y: 0.85 },
    scalar: 0.8,
  });

  fire(0.15, {
    angle: 120,
    origin: { x: 0.95, y: 0.85 },
    scalar: 0.8,
  });
}

export default function CartCelebration() {
  const cartCount = useCartCount();
  const prevCountRef = useRef(cartCount);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cartCount > prevCountRef.current) {

      console.log("[CartCelebration] fired — count is now", cartCount);
      setCelebration({
        id: Date.now(),
        count: cartCount,
      });
      fireConfetti();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(
        () => setCelebration(null),
        CELEBRATION_DURATION_MS
      );
    }
    prevCountRef.current = cartCount;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cartCount]);

  if (!celebration) return null;

  return (
    <div
      className="cart-celebration"
      key={celebration.id}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Brief brand-yellow page flash — semi-transparent overlay
          that pulses across the viewport as the burst starts. */}
      <div className="cart-celebration-flash" aria-hidden="true" />

      {/* Toast pill — slides down from top center, stays for the
          celebration duration, fades out. */}
      <div className="cart-celebration-toast" role="status">
        <span className="cart-celebration-icon" aria-hidden="true">
          <FaCheck />
        </span>
        <span className="cart-celebration-text">
          <span className="cart-celebration-text-eyebrow">
            Added to your call
          </span>
          <span className="cart-celebration-text-count font-primary">
            {celebration.count}{" "}
            {celebration.count === 1 ? "topic" : "topics"} ready
          </span>
        </span>
      </div>
    </div>
  );
}
