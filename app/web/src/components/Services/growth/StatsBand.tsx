import type { StatItem } from "./types";

/* The four-up KPI row that sits directly under every hero. */

export default function StatsBand({ items, label }: { items: StatItem[]; label: string }) {
  return (
    <section aria-label={label} className="w-full bg-white">
      <div className="mx-auto w-full max-w-360 px-4 py-8 sm:px-6 lg:px-10">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, value, label: statLabel }) => (
            <div
              key={statLabel}
              className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EE2B2C]/10 text-[#EE2B2C]">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <dt className="sr-only">{statLabel}</dt>
                <dd>
                  <span className="block text-2xl leading-none font-bold text-neutral-900 sm:text-[28px]">
                    {value}
                  </span>
                  <span className="mt-1.5 block text-xs leading-snug text-neutral-500">
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
