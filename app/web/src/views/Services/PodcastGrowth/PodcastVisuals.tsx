/**
 * Inline SVG visual language for the podcast page.
 *
 * Everything here is vector and drawn with currentColor so it inherits
 * the surrounding text colour and works on both the light and dark
 * sections. Deliberately not raster: public/Images already carries tens
 * of megabytes of Figma exports with PNGs base64-embedded inside .svg
 * wrappers, and next/image cannot optimise those. Icons cost bytes in
 * the hundreds, stay sharp on any display, and add nothing to LCP.
 */

type IconProps = { className?: string };

const box = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
  focusable: "false" as const,
};

/* Service + audience + operations iconography. Keyed by the `icon`
   field in podcastGrowthData so content and art stay decoupled. */
export const ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  video: (p) => (
    <svg {...box} className={p.className}>
      <rect x="2.5" y="5.5" width="13" height="13" rx="2.5" />
      <path d="M15.5 10.5 21.5 7v10l-6-3.5z" />
    </svg>
  ),
  audio: (p) => (
    <svg {...box} className={p.className}>
      <path d="M4 10v4M8 6.5v11M12 3.5v17M16 7.5v9M20 10.5v3" />
    </svg>
  ),
  clip: (p) => (
    <svg {...box} className={p.className}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10.5 9.5v5l4-2.5z" />
    </svg>
  ),
  thumb: (p) => (
    <svg {...box} className={p.className}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.75" />
      <path d="m3.5 17 5-4.5 4.5 4 3-2.5 4.5 4" />
    </svg>
  ),
  notes: (p) => (
    <svg {...box} className={p.className}>
      <path d="M5.5 3.5h9l5 5v12a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
      <path d="M14 3.5v5h5M8.5 12.5h7M8.5 16.5h4" />
    </svg>
  ),
  publish: (p) => (
    <svg {...box} className={p.className}>
      <path d="M12 3.5v11M12 3.5 8 7.5M12 3.5l4 4" />
      <path d="M4.5 14v5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-5" />
    </svg>
  ),
  globe: (p) => (
    <svg {...box} className={p.className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  ),
  chart: (p) => (
    <svg {...box} className={p.className}>
      <path d="M4 20V4M4 20h16" />
      <path d="m7.5 15 3.5-4 3 2.5 4.5-6" />
    </svg>
  ),
  mic: (p) => (
    <svg {...box} className={p.className}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5" />
    </svg>
  ),
  brand: (p) => (
    <svg {...box} className={p.className}>
      <path d="M3.5 20.5V9l8.5-5.5L20.5 9v11.5" />
      <path d="M3.5 20.5h17M9.5 20.5v-6h5v6" />
    </svg>
  ),
  network: (p) => (
    <svg {...box} className={p.className}>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M12 7.5v4M12 11.5 6.5 17M12 11.5 17.5 17" />
    </svg>
  ),
  clock: (p) => (
    <svg {...box} className={p.className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5V12l3.5 2.5" />
    </svg>
  ),
  dollar: (p) => (
    <svg {...box} className={p.className}>
      <path d="M12 2.5v19" />
      <path d="M16.5 7a3.5 3.5 0 0 0-3.5-2.5h-1.5a3.25 3.25 0 0 0 0 6.5h1a3.25 3.25 0 0 1 0 6.5H11A3.5 3.5 0 0 1 7.5 15" />
    </svg>
  ),
  lock: (p) => (
    <svg {...box} className={p.className}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name];
  return C ? C({ className }) : null;
}

/**
 * Hero diagram: one recording fanning out into the week's output.
 * Purely decorative — the same idea is stated in the hero copy, so it
 * carries aria-hidden and contributes nothing to the accessible name.
 */
export function HeroFanOut() {
  return (
    <svg
      className="pod-hero-art"
      viewBox="0 0 440 260"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="podFade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* source: the recording */}
      <rect
        x="8" y="96" width="112" height="68" rx="14"
        className="pod-art-source"
      />
      {/* waveform inside the source block */}
      <g className="pod-art-wave" strokeLinecap="round" strokeWidth="3.5">
        {[
          [30, 14], [40, 26], [50, 38], [60, 24],
          [70, 44], [80, 20], [90, 30], [100, 12],
        ].map(([x, h]) => (
          <line key={x} x1={x} y1={130 - h / 2} x2={x} y2={130 + h / 2} />
        ))}
      </g>

      {/* connectors fanning to each output */}
      <g stroke="url(#podFade)" strokeWidth="2" fill="none">
        <path d="M120 130 C 175 130, 175 34, 236 34" />
        <path d="M120 130 C 175 130, 175 98, 236 98" />
        <path d="M120 130 C 175 130, 175 162, 236 162" />
        <path d="M120 130 C 175 130, 175 226, 236 226" />
      </g>

      {/* outputs */}
      {[
        { y: 12, w: 190, label: "Episode" },
        { y: 76, w: 156, label: "Clips" },
        { y: 140, w: 172, label: "Packaging" },
        { y: 204, w: 138, label: "Notes" },
      ].map((o) => (
        <g key={o.label} className="pod-art-out">
          <rect x="236" y={o.y} width={o.w} height="44" rx="10" />
          <text x="252" y={o.y + 28} className="pod-art-label">
            {o.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Four-stage rail drawn behind the Signal-to-Scale cards on wide
 * viewports. Decorative reinforcement of the ordering already carried
 * by the ordered list in markup.
 */
export function StageRail() {
  return (
    <svg
      className="pod-stage-rail"
      viewBox="0 0 1000 8"
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="0" y1="4" x2="1000" y2="4" strokeWidth="2" strokeDasharray="6 8" />
    </svg>
  );
}
