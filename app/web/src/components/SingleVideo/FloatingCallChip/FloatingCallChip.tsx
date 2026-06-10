// @ts-nocheck
"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { FaArrowRight } from "react-icons/fa";
import { useCartCount } from "@/src/lib/cart";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";


const FOUNDER_PORTRAIT_URL =
  "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png";

/** CSS selector for the existing mid-page Book Call CTA section.
 *  The chip auto-hides when this section is in/past view. */
const BOOK_CALL_SECTION_SELECTOR = ".home-book-call-container-wrapper";

export default function FloatingCallChip() {
  const [visible, setVisible] = useState(false);
  const initialTimerRef = useRef(null);

  // Cart-aware state. cartCount > 0 → render the fulled-cart
  // variant. We don't gate on a specific page — the chip lives on
  // multiple routes and reads cart state directly so it always
  // tells the truth about what the user has queued up.
  const cartCount = useCartCount();
  const hasCart = cartCount > 0;

  // On mobile we already render a fixed bottom cart bar when cart
  // has items (see Services.jsx + SingleService.jsx). The chip
  // would compete with it visually. Hide on mobile-with-cart so
  // the cart bar is the single source of truth there.
  const isMobile = useMediaQuery("(max-width: 600px)");
  const suppressForMobileCartBar = isMobile && hasCart;

  useEffect(() => {
    initialTimerRef.current = setTimeout(() => setVisible(true), 600);

    const checkVisibility = () => {
      const target = document.querySelector(BOOK_CALL_SECTION_SELECTOR);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const inOrPast = rect.top <= vh * 0.3;
      setVisible(!inOrPast);
    };

    window.addEventListener("scroll", checkVisibility, { passive: true });
    window.addEventListener("resize", checkVisibility, { passive: true });
    const settle = setTimeout(checkVisibility, 700);

    return () => {
      clearTimeout(initialTimerRef.current);
      clearTimeout(settle);
      window.removeEventListener("scroll", checkVisibility);
      window.removeEventListener("resize", checkVisibility);
    };
  }, []);

  // Suppress entirely when cart bar is already on screen (mobile-with-cart).
  if (suppressForMobileCartBar) {
    return null;
  }

  /* ---------- FULLED-cart variant ---------- */
  if (hasCart) {
    return (
      <Link
        to="/cart"
        className={`floating-call-chip floating-call-chip--cart ${visible ? "is-visible" : "is-hidden"
          }`}
        aria-label={`Your call agenda — ${cartCount} ${cartCount === 1 ? "topic" : "topics"
          }, schedule with Anil`}
      >
        <span className="floating-call-chip-count" aria-hidden="true">
          {cartCount}
        </span>
        <span className="floating-call-chip-body">
          <span className="floating-call-chip-eyebrow">On your call</span>
          <span className="floating-call-chip-cta">
            Schedule with Anil <FaArrowRight aria-hidden="true" />
          </span>
        </span>
      </Link>
    );
  }

  /* ---------- EMPTY-cart (default) variant ---------- */
  return (
    <Link
      to="/ScheduleMeeting"
      className={`floating-call-chip ${visible ? "is-visible" : "is-hidden"}`}
      aria-label="Talk to Anil — book a 15 min call"
    >
      <span className="floating-call-chip-avatar" aria-hidden="true">
        <Image
          src={FOUNDER_PORTRAIT_URL}
          alt=""
          width={48}
          height={48}
        />
      </span>
      <span className="floating-call-chip-body">
        <span className="floating-call-chip-eyebrow">Talk to Anil</span>
        <span className="floating-call-chip-cta">
          Book a 15-min call <FaArrowRight aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
