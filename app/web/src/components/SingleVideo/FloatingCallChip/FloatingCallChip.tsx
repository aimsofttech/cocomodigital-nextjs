// @ts-nocheck
"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { FaArrowRight } from "react-icons/fa";
import { s3Url } from "@/src/lib/s3";


const FOUNDER_PORTRAIT_URL =
  s3Url("book-a-call/1761986854_anil%20mahato%20marketing.png");

/** CSS selector for the existing mid-page Book Call CTA section.
 *  The chip auto-hides when this section is in/past view. */
const BOOK_CALL_SECTION_SELECTOR = ".home-book-call-container-wrapper";

export default function FloatingCallChip() {
  const [visible, setVisible] = useState(false);
  const initialTimerRef = useRef(null);


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

  return (
    <Link
      to="/contact-us"
      className={`floating-call-chip ${visible ? "is-visible" : "is-hidden"}`}
      aria-label="Apply to work with us"
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
        <span className="floating-call-chip-eyebrow">Work with us</span>
        <span className="floating-call-chip-cta">
          Apply now <FaArrowRight aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
