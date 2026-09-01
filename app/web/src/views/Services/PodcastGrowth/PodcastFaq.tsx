"use client";

import { useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import type { PodcastFaqItem } from "@/src/lib/podcast";
import SectionEditLink from "@/src/components/common/SectionEditLink/SectionEditLink";

/**
 * Accessible FAQ accordion.
 *
 * Each row is a real <button> inside the heading, so it is reachable by
 * Tab and operable with Enter/Space for free — no key handlers needed.
 * aria-expanded/aria-controls tie the control to its panel. Panels stay
 * in the DOM and are hidden with the `hidden` attribute rather than
 * being unmounted, so the answer text is present for crawlers even when
 * the row is closed, matching the FAQPage JSON-LD emitted by the page.
 */
export default function PodcastFaq({
  items,
  pageId,
}: {
  items: PodcastFaqItem[];
  /* Only used to build an editor's link to a question's own form; the
     component renders nothing extra without it. */
  pageId?: string;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="pod-faq-list">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.question} className="pod-faq-item">
            {pageId && item.id && (
              <SectionEditLink
                module="podcast"
                compact
                to={`podcast/faq?podcastPageId=${pageId}&editId=${item.id}`}
                label={item.question}
              />
            )}
            <h3 className="pod-faq-question">
              <button
                type="button"
                className="pod-faq-trigger"
                aria-expanded={isOpen}
                aria-controls={`pod-faq-panel-${i}`}
                id={`pod-faq-trigger-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span className="pod-faq-trigger-text">{item.question}</span>
                <span className="pod-faq-icon" aria-hidden="true">
                  {isOpen ? <FaMinus /> : <FaPlus />}
                </span>
              </button>
            </h3>
            <div
              id={`pod-faq-panel-${i}`}
              role="region"
              aria-labelledby={`pod-faq-trigger-${i}`}
              className="pod-faq-panel"
              hidden={!isOpen}
            >
              <p className="pod-faq-answer">{item.answer}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
