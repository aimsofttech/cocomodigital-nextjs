import { FiHeart } from "react-icons/fi";
import type { GrowthShowcase } from "@/src/lib/growthServices";
import { requiredIcon } from "./icons";
import { CheckBullet } from "./Primitives";
import { CARD, ICON_CHIP } from "./theme";

/* Vertical-format showcase — one card per platform, each with a 9:16 mock and
   a bullet list. Three across on desktop; the grid drops to one column on
   mobile so the mock never gets squeezed below a readable size. */

export default function ShowcaseGrid({ items }: { items: GrowthShowcase[] }) {
  if (!items.length) return null;

  return (
    <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
      {items.map((item) => {
        const Icon = requiredIcon(item.icon);
        return (
          <li key={item.title}>
            <article className={`${CARD} h-full p-5`}>
              <h3 className="flex items-center gap-2.5 font-satoshi text-base font-black text-strong">
                <span className={`${ICON_CHIP} h-9 w-9`}>
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                {item.title}
              </h3>

              <div className="relative mt-4 flex aspect-[9/13] flex-col justify-between overflow-hidden rounded-sticker border-2 border-strong bg-dark-surface p-4">
                {item.mediaBadge === "ratio" ? (
                  <span className="self-start rounded-sm bg-brand px-2 py-0.5 text-[10px] font-black text-brand-on">
                    9:16
                  </span>
                ) : (
                  <span aria-hidden="true" />
                )}
                <p className="font-satoshi text-lg leading-tight font-black text-white uppercase">
                  {item.caption}
                </p>
                {item.metric ? (
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-brand">
                    <FiHeart className="h-3 w-3" aria-hidden="true" />
                    {item.metric}
                  </p>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>

              {item.points.length ? (
                <ul className="mt-4 space-y-2.5">
                  {item.points.map((point) => (
                    <CheckBullet key={point}>{point}</CheckBullet>
                  ))}
                </ul>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
