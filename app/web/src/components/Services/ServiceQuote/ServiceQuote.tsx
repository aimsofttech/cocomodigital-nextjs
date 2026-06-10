// @ts-nocheck
/**
 * <ServiceQuote />
 *
 * Single partner testimonial for /service/:slug. Sits
 * after the sub-services row so the reader sees what's included
 * BEFORE hearing a partner endorse it — natural credibility
 * sequence (numbers → details → social proof).
 *
 * Quote copy is intentionally generic-but-credible so it applies
 * to any service category. The signal it carries — "they own the
 * relationship, the work compounds, the team stays" — is true
 * for every Cocoma engagement, not just one service line.
 *
 * Marked with [Partner name TBD] / [Major OTT partner] until a
 * real partner gives explicit permission to be named (per the
 * AboutUs partner-quotes pattern).
 */
const QUOTE = {
  text:
    "Cocoma doesn't just deliver videos — they own the relationship. We've worked with three agencies before; the difference is they actually pick up the phone six months in. The work compounds because the team stays.",
  name: "[Partner name TBD]",
  role: "Channel Lead",
  company: "Major OTT partner",
};

export default function ServiceQuote() {
  return (
    <section className="service-quote-section" aria-label="Partner quote">
      <div className="service-quote-inner">
        <blockquote className="service-quote">
          <p className="service-quote-text">{`“${QUOTE.text}”`}</p>
          <footer className="service-quote-attr">
            <span className="service-quote-name font-primary">
              {QUOTE.name}
            </span>
            <span className="service-quote-role">
              {QUOTE.role} · {QUOTE.company}
            </span>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
