// @ts-nocheck
"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";

type CarouselProps = {
  children: ReactNode;
  controls?: boolean;
  indicators?: boolean;
  interval?: number | null;
  pause?: "hover" | false;
};

function CarouselItem({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <div className={active ? "block w-full" : "hidden w-full"} aria-hidden={!active}>
      {children}
    </div>
  );
}

function TailwindCarousel({
  children,
  controls = true,
  indicators = true,
  interval = null,
  pause = false,
}: CarouselProps) {
  const slides = useMemo(() => Children.toArray(children), [children]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const hasMultiple = count > 1;

  const goTo = (index: number) => {
    if (!count) return;
    setActiveIndex((index + count) % count);
  };

  useEffect(() => {
    if (!interval || !hasMultiple || paused) return;
    const timer = window.setInterval(() => goTo(activeIndex + 1), interval);
    return () => window.clearInterval(timer);
  }, [activeIndex, interval, hasMultiple, paused]);

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => pause === "hover" && setPaused(true)}
      onMouseLeave={() => pause === "hover" && setPaused(false)}
    >
      {slides.map((slide, index) =>
        isValidElement(slide)
          ? cloneElement(slide, { active: index === activeIndex, key: index })
          : slide,
      )}

      {controls && hasMultiple && (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-xl font-bold text-black shadow transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            aria-label="Previous slide"
            onClick={() => goTo(activeIndex - 1)}
          >
            &#8249;
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-xl font-bold text-black shadow transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            aria-label="Next slide"
            onClick={() => goTo(activeIndex + 1)}
          >
            &#8250;
          </button>
        </>
      )}

      {indicators && hasMultiple && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`h-2.5 rounded-full transition ${index === activeIndex ? "w-7 bg-white" : "w-2.5 bg-white/55"}`}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

TailwindCarousel.Item = CarouselItem;

export default TailwindCarousel;
