import { DESIGN_FAQ } from "./designData";
import { H2, WRAP } from "./designTheme";

/**
 * Four questions in a two-column grid, each under a 2px ink rule. Static by
 * design — four short answers read better open than behind an accordion, and
 * the same copy is published as FAQPage structured data from the route.
 */
export default function DesignFaq() {
  const { title, items } = DESIGN_FAQ;

  return (
    <section aria-labelledby="design-faq-title" className="w-full bg-page pt-16 pb-16 md:pt-22 md:pb-22">
      <div className={`${WRAP} flex flex-col gap-8`}>
        <h2 id="design-faq-title" className={`${H2} md:text-[36px]`}>
          {title}
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.question} className="border-t-2 border-strong py-5">
              <dt className="mb-2 text-lg font-extrabold text-strong">{item.question}</dt>
              <dd className="text-[15px] leading-[1.55] text-body">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
