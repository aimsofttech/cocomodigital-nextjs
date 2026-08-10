import type { StatItem } from "./types";
import { CARD, ICON_CHIP } from "./theme";

/* The four-up KPI row that sits directly under every hero. */

export default function StatsBand({ items, label }: { items: StatItem[]; label: string }) {
  return (
    <section aria-label={label} className="w-full bg-page">
      <div className="mx-auto w-full max-w-360 px-4 py-8 sm:px-6 lg:px-10">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, value, label: statLabel }) => (
            <div key={statLabel} className={`${CARD} flex items-center gap-4 p-5`}>
              <span className={`${ICON_CHIP} h-12 w-12`}>
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <dt className="sr-only">{statLabel}</dt>
                <dd>
                  <span className="block font-satoshi text-2xl leading-none font-black text-strong sm:text-[28px]">
                    {value}
                  </span>
                  <span className="mt-1.5 block text-xs leading-snug text-muted">
                    {statLabel}
                  </span>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
