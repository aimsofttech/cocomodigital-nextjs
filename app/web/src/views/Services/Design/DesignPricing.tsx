import Link from "next/link";
import { CARD } from "@/src/components/Services/growth/theme";
import { DESIGN_PRICING } from "./designData";
import { BTN_DARK, BTN_DARK_IDLE, BTN_OUTLINE, EYEBROW, H2, WRAP } from "./designTheme";

/**
 * Placeholder pricing band. Only mounted when SHOW_PRICING is true (see
 * DesignPage); the INR/USD switch is visual only until there is a rate card
 * to convert.
 */
export default function DesignPricing() {
  const { eyebrow, title, currencies, tiers, footnote } = DESIGN_PRICING;

  return (
    <section id="pricing" aria-labelledby="design-pricing-title" className="w-full bg-page py-16 md:py-22">
      <div className={`${WRAP} flex flex-col gap-9`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${EYEBROW} mb-2.5 text-muted`}>{eyebrow}</p>
            <h2 id="design-pricing-title" className={H2}>
              {title}
            </h2>
          </div>
          <div
            className="inline-flex overflow-hidden rounded-pill border-2 border-strong text-[13px] font-black"
            aria-label="Currency (display only)"
          >
            {currencies.map((currency, index) => (
              <span
                key={currency}
                className={index === 0 ? "bg-strong px-4 py-2 text-page" : "px-4 py-2 text-strong"}
                aria-current={index === 0 ? "true" : undefined}
              >
                {currency}
              </span>
            ))}
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <li
              key={tier.name}
              className={`${CARD} flex flex-col p-8 ${
                tier.featured ? "bg-brand shadow-[4px_4px_0_var(--text-strong,#111)]" : ""
              }`}
            >
              <p className={`${EYEBROW} flex items-center justify-between gap-3`}>
                {tier.name}
                {tier.badge ? (
                  <span className="rounded-pill bg-strong px-2.5 py-1 text-[11px] text-brand">
                    {tier.badge}
                  </span>
                ) : null}
              </p>
              <p className="mt-3.5 mb-1 font-primary text-[44px] leading-none font-black tracking-[-1.2px] text-strong">
                {tier.price}
                {tier.period ? (
                  <span className="text-lg font-black text-muted">{tier.period}</span>
                ) : null}
              </p>
              <p className="mb-5.5 text-sm text-muted">{tier.tagline}</p>
              <ul className="mb-7 list-disc pl-4.5 text-[15px] leading-[1.8] text-strong">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link
                href={tier.cta.href}
                className={`mt-auto self-start ${
                  tier.cta.variant === "dark" ? `${BTN_DARK} ${BTN_DARK_IDLE}` : `${BTN_OUTLINE} px-5 py-3`
                }`}
              >
                {tier.cta.label}
                {tier.cta.variant === "outline" ? <span aria-hidden="true">↗</span> : null}
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-[13px] text-muted">{footnote}</p>
      </div>
    </section>
  );
}
