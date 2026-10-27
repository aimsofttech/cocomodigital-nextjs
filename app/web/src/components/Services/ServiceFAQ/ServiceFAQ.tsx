import EditPencil from "@/src/components/common/EditPencil/EditPencil";
import { adminRoutes } from "@/src/lib/adminEditRoutes";

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

/** One question. `id` is present only on the admin-managed set, which is
 *  what decides whether the row can carry a pencil. */
interface ServiceFaqEntry {
  q: string;
  a: string;
  id?: string;
}

const DEFAULT_QUESTIONS: ServiceFaqEntry[] = [
  {
    q: "How quickly can we get started?",
    a:
      "Most engagements kick off within 5–7 business days of the engagement letter. Working session → written scope → kick-off → first deliverable.",
  },
  {
    q: "What's the minimum commitment?",
    a:
      "Engagements are monthly retainers with 30 days' notice. Title launches are scoped per title.",
  },
  {
    q: "Do you work alongside our existing team?",
    a:
      "Yes. We slot into your workflow — Slack, your CMS, your style guide, your review cycles. Or we own end-to-end if you don't have an internal team. Both work; both are common.",
  },
  {
    q: "Who will I actually work with?",
    a:
      "A dedicated pod of 3–5 specialists from the relevant departments (editors, designers, marketers), with one PM as your single point of contact. A senior producer leads the working session; Anil joins the kick-off.",
  },
  {
    q: "What if we want to pause or stop?",
    a:
      "30 days notice on recurring services, then we wrap cleanly: handover docs, raw files, the lot.",
  },
  {
    q: "How is this priced?",
    a:
      "Monthly engagements from ₹2.5 lakh in India and USD 3,000 elsewhere; USD 5,000 for clients in the US, UK, Canada and Europe. After the working session we send one written scope and price.",
  },
];

export default function ServiceFAQ({ questions = DEFAULT_QUESTIONS, serviceId = undefined }) {
  return (
    <section
      className="service-faq-section edit-host"
      aria-labelledby="service-faq-heading"
    >
      {/* Only the admin-managed set is addressable. DEFAULT_QUESTIONS is the
          copy this component ships with when a service has none configured —
          there is no record behind it, so it gets no pencil. */}
      {serviceId ? (
        <EditPencil to={adminRoutes.groupService.faq()} label="the service FAQs" />
      ) : null}
      <div className="service-faq-inner">
        <header className="service-faq-header">
          <p className="service-faq-eyebrow">Before you apply</p>
          <h2 id="service-faq-heading" className="service-faq-heading font-primary">
            The questions everyone asks.
          </h2>
          <p className="service-faq-sub">
            Six things we get asked on every working session. If
            yours isn't here, ask on the call — we don't keep a
            mystery deck.
          </p>
        </header>

        <ul className="service-faq-list">
          {questions.map((item, idx) => (
            <li key={idx} className="service-faq-item edit-host">
              {item.id ? (
                <EditPencil to={adminRoutes.groupService.faq(item.id)} label={item.q} />
              ) : null}
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
