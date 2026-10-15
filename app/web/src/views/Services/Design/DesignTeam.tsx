import Image from "next/image";
import { DESIGN_TEAM } from "./designData";
import { EYEBROW, FRAME, H2, LEAD, WRAP } from "./designTheme";

/** The four-up team strip: 4:5 portrait, name, role. Two-up on phones. */
export default function DesignTeam() {
  const { eyebrow, title, lead, people } = DESIGN_TEAM;

  return (
    <section id="team" aria-labelledby="design-team-title" className="w-full bg-page py-12 md:pt-12 md:pb-20">
      <div className={`${WRAP} flex flex-col gap-9`}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className={`${EYEBROW} mb-2.5 text-muted`}>{eyebrow}</p>
            <h2 id="design-team-title" className={`${H2} md:text-[40px]`}>
              {title}
            </h2>
          </div>
          <p className={`${LEAD} max-w-[480px] md:text-[17px]`}>{lead}</p>
        </div>
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {people.map((person) => (
            <li key={person.name} className="flex flex-col gap-3">
              <div className={`${FRAME} relative aspect-[4/5] bg-page-tint`}>
                <Image
                  src={person.photo}
                  alt={person.alt}
                  fill
                  sizes="(max-width: 768px) 45vw, 280px"
                  className="object-cover"
                />
              </div>
              <p className="text-lg font-extrabold text-strong">{person.name}</p>
              <p className="-mt-2 text-sm text-muted">{person.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
