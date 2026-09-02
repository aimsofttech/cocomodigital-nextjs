import type { HeadingLevel, StatItem } from "./types";
import { Heading } from "./Primitives";
import { CARD, ICON_CHIP } from "./theme";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";

/* The four-up KPI row that sits directly under every hero.

   The band carries no visible heading in the design, so its name is an sr-only
   H2. That keeps it in the document outline — a bare aria-label names the
   region but leaves a gap between the hero's H1 and the first band's H2. */

export default function StatsBand({
  items,
  label,
  id,
  headingLevel = 2,
}: {
  items: StatItem[];
  label: string;
  id: string;
  headingLevel?: HeadingLevel;
}) {
  return (
    <section aria-labelledby={id} className="w-full bg-page">
      <div className="mx-auto w-full max-w-360 px-4 py-8 sm:px-6 lg:px-10">
        <Heading level={headingLevel} id={id} className="sr-only">
          {label}
        </Heading>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, value, label: statLabel, editTo }) => (
            <div key={statLabel} className={`${CARD} flex items-center gap-4 p-5 edit-host`}>
              {editTo ? <EditPencil to={editTo} label={statLabel} /> : null}
              <span className={`${ICON_CHIP} h-12 w-12`}>
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <dt className="sr-only">{statLabel}</dt>
                <dd>
                  <span className="block font-satoshi text-2xl leading-none font-black text-strong sm:text-[28px]">
                    {value}
                  </span>
                  <span className="mt-1.5 block text-sm leading-snug text-muted">
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
