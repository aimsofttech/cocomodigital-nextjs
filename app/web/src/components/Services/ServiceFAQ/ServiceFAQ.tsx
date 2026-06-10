// @ts-nocheck
/**
 * <ServiceFAQ />
 *
 * Sticker-style FAQ accordion for /service/:slug. Sits
 * between the trust signals (CredentialsStrip / TrustedByStrip)
 * and the book-call CTA so last-minute objections get answered
 * BEFORE the user has to decide whether to book.
 *
 * Uses native <details>/<summary> for the accordion mechanic —
 * zero JS, accessible by default (keyboard, screen reader),
 * works without hydration. The <summary> is the question, the
 * answer body is whatever sits inside the <details>.
 *
 * Questions chosen to address the most common pre-call concerns
 * for any Cocoma service engagement: speed-to-start, commitment,
 * collaboration, team, exit, pricing. Generic enough to apply
 * across every service-detail page; if a specific service ever
 * needs custom Q&As, this component can take a `questions` prop
 * to override.
 */

const DEFAULT_QUESTIONS = [
  {
    q: "How quickly can we get started?",
    a:
      "Most engagements kick off within 5–7 business days of the engagement letter. Discovery call → scope → kick-off → first deliverable. If you're on a tight launch window, we've turned around in three.",
  },
  {
    q: "What's the minimum commitment?",
    a:
      "Recurring services run month-to-month — no annual lock-in. One-time projects are scoped per deliverable. We'd rather you renew because the work is good than because you're stuck.",
  },
  {
    q: "Do you work alongside our existing team?",
    a:
      "Yes. We slot into your workflow — Slack, your CMS, your style guide, your review cycles. Or we own end-to-end if you don't have an internal team. Both work; both are common.",
  },
  {
    q: "Who will I actually work with?",
    a:
      "A dedicated pod of 3–5 specialists from the relevant departments (editors, designers, marketers), with one PM as your single point of contact. Anil joins the kick-off call himself and stays reachable on Slack.",
  },
  {
    q: "What if we want to pause or stop?",
    a:
      "30 days notice on recurring services, then we wrap cleanly — handover docs, raw files, the lot. No penalties, no hidden fees, no awkward extraction.",
  },
  {
    q: "How is this priced?",
    a:
      "Scope-dependent. After the discovery call we send a written estimate within 48 hours — no surprise quotes, no high-pressure sales, no bait-and-switch. If our number doesn't fit, we'll tell you what does.",
  },
];

export default function ServiceFAQ({ questions = DEFAULT_QUESTIONS }) {
  return (
    <section
      className="service-faq-section"
      aria-labelledby="service-faq-heading"
    >
      <div className="service-faq-inner">
        <header className="service-faq-header">
          <p className="service-faq-eyebrow">Before you book</p>
          <h2 id="service-faq-heading" className="service-faq-heading font-primary">
            The questions everyone asks.
          </h2>
          <p className="service-faq-sub">
            Six things we get asked on every discovery call. If
            yours isn't here, ask on the call — we don't keep a
            mystery deck.
          </p>
        </header>

        <ul className="service-faq-list">
          {questions.map((item, idx) => (
            <li key={idx} className="service-faq-item">
              {/* Native <details> = zero-JS accordion. Default
                  closed. Click anywhere on the summary to toggle. */}
              <details className="service-faq-details">
                <summary className="service-faq-question">
                  <span className="service-faq-q-text font-primary">
                    {item.q}
                  </span>
                  <span
                    className="service-faq-q-icon"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <div className="service-faq-answer">
                  <p>{item.a}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
