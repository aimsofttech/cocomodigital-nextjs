// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { Link, useLocation } from "@/src/lib/navigation";

const LegalPage = ({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections,
  otherDocs,
}) => {
  const location = useLocation();
  const [activeId, setActiveId] = useState(sections[0]?.id);

  // Sticky-TOC active-state tracking. Whichever section's top is
  // the highest one that's already past the viewport's 200px mark
  // is the one we treat as "current." If none yet, we default to
  // the first section.
  useEffect(() => {
    const handleScroll = () => {
      const tops = sections
        .map((s) => {
          const el = document.getElementById(s.id);
          return el ? { id: s.id, top: el.getBoundingClientRect().top } : null;
        })
        .filter(Boolean);
      if (!tops.length) return;
      const past = tops.filter((t) => t.top < 200);
      const current = past.length ? past[past.length - 1] : tops[0];
      setActiveId(current.id);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="legal-hero-inner">
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1 className="legal-title font-primary">{title}</h1>
          <p className="legal-lastupdated">
            Last updated: <strong>{lastUpdated}</strong>
          </p>
          {intro && <div className="legal-intro">{intro}</div>}
          {otherDocs && otherDocs.length > 0 && (
            <nav
              className="legal-otherdocs"
              aria-label="Related legal documents"
            >
              <span className="legal-otherdocs-label">See also:</span>
              {otherDocs.map((d) => (
                <Link
                  key={d.path}
                  to={d.path}
                  className="legal-otherdocs-link"
                >
                  {d.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <div className="legal-body-section">
        <div className="legal-body-inner">
          <aside className="legal-toc">
            <p className="legal-toc-label">Contents</p>
            <ol className="legal-toc-list">
              {sections.map((s, idx) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`legal-toc-link ${activeId === s.id ? "is-active" : ""
                      }`}
                  >
                    <span className="legal-toc-num">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="legal-toc-title">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <article className="legal-body">
            {sections.map((s, idx) => (
              <section key={s.id} id={s.id} className="legal-section">
                <header className="legal-section-header">
                  <span className="legal-section-num font-primary">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h2 className="legal-section-title font-primary">
                    {s.title}
                  </h2>
                </header>
                <div className="legal-section-body">{s.body}</div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
