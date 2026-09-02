import type { CaseStudyContent, HeadingLevel } from "./types";
import { Heading } from "./Primitives";
import { CARD, HIGHLIGHT } from "./theme";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";

/* Case-study block: media on the left, narrative plus a
   before / after / growth table on the right. The table keeps its
   own horizontal scroll so the page body never scrolls sideways
   on small screens. */

export default function CaseStudy({
  content,
  headingLevel = 3,
  id,
}: {
  content: CaseStudyContent;
  /** The client name sits one level under the band heading. */
  headingLevel?: HeadingLevel;
  /** Prefix for the ids that label the block and its results table. */
  id: string;
}) {
  /* The table is a distinct sub-block of the case study, so it is named by a
     heading rather than by a <caption>. The design has no room for a visible
     label, hence sr-only — but the heading still puts the results in the
     document outline and gives the table its accessible name. */
  const tableLevel = Math.min(6, headingLevel + 1) as HeadingLevel;
  const tableHeadingId = `${id}-results`;

  return (
    <div className={`${CARD} mt-10 overflow-hidden p-4 sm:p-6`}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-4">{content.media}</div>

        <div className="lg:col-span-3">
          <Heading
            level={headingLevel}
            className="font-satoshi text-xl font-black text-strong sm:text-2xl"
          >
            {content.title}
          </Heading>
          {content.subtitle ? (
            <p className="mt-1.5 text-[13px] font-bold tracking-wide text-subtle uppercase sm:text-sm">
              {content.subtitle}
            </p>
          ) : null}
          {content.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="lg:col-span-5">
          <Heading level={tableLevel} id={tableHeadingId} className="sr-only">
            {content.title} results before and after working with Cocoma Digital
          </Heading>
          <div className="overflow-x-auto">
            <table
              aria-labelledby={tableHeadingId}
              className="w-full min-w-[420px] border-collapse text-base"
            >
              <thead>
                <tr className="border-b-2 border-strong text-[13px] sm:text-sm">
                  <th scope="col" className="py-2.5 pr-3 text-left font-bold">
                    <span className="sr-only">Metric</span>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-center font-black tracking-wide text-strong uppercase"
                  >
                    Before
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-center font-black tracking-wide text-strong uppercase"
                  >
                    After
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 pl-3 text-center font-black tracking-wide text-strong uppercase"
                  >
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.rows.map(({ label, icon: Icon, before, after, growth, editTo }) => (
                  <tr key={label} className="border-b border-strong/12 last:border-0">
                    <th
                      scope="row"
                      className="py-3.5 pr-3 text-left text-sm font-bold text-body sm:text-[15px] edit-host"
                    >
                      {editTo ? <EditPencil to={editTo} label={label} /> : null}
                      <span className="flex items-center gap-2">
                        {Icon ? (
                          <Icon
                            className="h-[18px] w-[18px] shrink-0 text-strong"
                            aria-hidden="true"
                          />
                        ) : null}
                        {label}
                      </span>
                    </th>
                    <td className="px-3 py-3.5 text-center text-sm text-muted sm:text-[15px]">
                      {before}
                    </td>
                    <td className="px-3 py-3.5 text-center text-sm font-bold text-strong sm:text-[15px]">
                      {after}
                    </td>
                    {/* The win is marked with the brand highlight rather than a
                        green that exists nowhere else in the design system. */}
                    <td className="py-3.5 pl-3 text-center text-sm font-black text-strong sm:text-[15px]">
                      <span className={HIGHLIGHT}>{growth}</span>
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
