import type { CaseStudyContent } from "./types";

/* Case-study block: media on the left, narrative plus a
   before / after / growth table on the right. The table keeps its
   own horizontal scroll so the page body never scrolls sideways
   on small screens. */

export default function CaseStudy({ content }: { content: CaseStudyContent }) {
  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-4">{content.media}</div>

        <div className="lg:col-span-3">
          <h3 className="text-lg font-bold text-neutral-900">{content.title}</h3>
          {content.subtitle ? (
            <p className="mt-1 text-xs font-medium text-neutral-400">{content.subtitle}</p>
          ) : null}
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm leading-relaxed text-neutral-500">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="lg:col-span-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] border-collapse text-sm">
              <caption className="sr-only">
                Results before and after working with Cocoma Digital
              </caption>
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th scope="col" className="py-2.5 pr-3 text-left font-medium">
                    <span className="sr-only">Metric</span>
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center font-semibold text-neutral-700">
                    Before
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center font-semibold text-neutral-700">
                    After
                  </th>
                  <th scope="col" className="py-2.5 pl-3 text-center font-semibold text-neutral-700">
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.rows.map(({ label, icon: Icon, before, after, growth }) => (
                  <tr key={label} className="border-b border-neutral-100 last:border-0">
                    <th
                      scope="row"
                      className="py-3 pr-3 text-left text-[13px] font-medium text-neutral-700"
                    >
                      <span className="flex items-center gap-2">
                        {Icon ? (
                          <Icon className="h-4 w-4 shrink-0 text-[#EE2B2C]" aria-hidden="true" />
                        ) : null}
                        {label}
                      </span>
                    </th>
                    <td className="px-3 py-3 text-center text-[13px] text-neutral-500">{before}</td>
                    <td className="px-3 py-3 text-center text-[13px] font-semibold text-neutral-900">
                      {after}
                    </td>
                    <td className="py-3 pl-3 text-center text-[13px] font-bold text-emerald-600">
                      {growth}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
