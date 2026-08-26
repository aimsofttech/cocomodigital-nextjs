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

/* ==================================================================
   Stage diagrams — placeholders for the Signal-to-Scale cards.

   PLACEHOLDER, but deliberately not decoration. Each one draws the
   idea the stage argues, so the section is scannable before the
   photography exists. Shots M-01 to M-04 on the shot list replace
   them; a diagram that explains something is a better stand-in than
   a grey box, and an honest one — nothing here imitates a screenshot
   or implies a result.

   Drawn in the page's existing language: 2px strokes, brand yellow
   for the thing being emphasised, currentColor for everything else.
   ================================================================== */

const diagramBox = {
  viewBox: "0 0 320 132",
  role: "presentation" as const,
  "aria-hidden": true as const,
  focusable: "false" as const,
  className: "pod-stage-art",
};

/** Align — one goal, three pillars hanging off it. */
function AlignDiagram() {
  return (
    <svg {...diagramBox}>
      <rect x="112" y="8" width="96" height="26" rx="6" className="pod-art-fill" />
      <text x="160" y="26" className="pod-art-tiny" textAnchor="middle">GOAL</text>
      <path d="M160 34v18M52 74V60h216v14M160 52v22" className="pod-art-line" />
      {[
        { x: 16, label: "PILLAR" },
        { x: 116, label: "PILLAR" },
        { x: 216, label: "PILLAR" },
      ].map((p) => (
        <g key={p.x}>
          <rect x={p.x} y="74" width="88" height="46" rx="6" className="pod-art-outline" />
          <text x={p.x + 44} y="94" className="pod-art-tiny" textAnchor="middle">{p.label}</text>
          <path d={`M${p.x + 16} 106h56`} className="pod-art-line" opacity="0.35" />
        </g>
      ))}
    </svg>
  );
}

/** Engineer — two packaging routes, one winning on click-through. */
function EngineerDiagram() {
  return (
    <svg {...diagramBox}>
      {[
        { x: 14, bar: 34, win: false, tag: "A" },
        { x: 172, bar: 96, win: true, tag: "B" },
      ].map((o) => (
        <g key={o.tag}>
          <rect
            x={o.x} y="8" width="134" height="74" rx="6"
            className={o.win ? "pod-art-fill" : "pod-art-outline"}
          />
          <path d={`M${o.x + 14} 68l24-22 18 16 20-18 24 24`} className="pod-art-line" />
          <circle cx={o.x + 34} cy="30" r="7" className="pod-art-line" />
          <text x={o.x + 118} y="24" className="pod-art-tiny" textAnchor="middle">{o.tag}</text>
          <rect x={o.x} y="94" width={o.bar} height="10" rx="5" className="pod-art-fill" />
          <rect x={o.x} y="94" width="134" height="10" rx="5" className="pod-art-outline" />
        </g>
      ))}
      <text x="160" y="126" className="pod-art-tiny" textAnchor="middle">CLICK-THROUGH</text>
    </svg>
  );
}

/** Amplify — one session, many platform-shaped outputs. */
function AmplifyDiagram() {
  return (
    <svg {...diagramBox}>
      <rect x="8" y="42" width="72" height="48" rx="6" className="pod-art-fill" />
      <g className="pod-art-line">
        {[24, 34, 44, 54, 64].map((x, i) => (
          <line key={x} x1={x} y1={66 - [8, 14, 6, 16, 10][i]} x2={x} y2={66 + [8, 14, 6, 16, 10][i]} />
        ))}
      </g>
      <path
        d="M80 66h26M106 66c14 0 14-44 28-44M106 66c14 0 14-14 28-14M106 66c14 0 14 14 28 14M106 66c14 0 14 44 28 44"
        className="pod-art-line"
        fill="none"
      />
      <rect x="134" y="8" width="178" height="26" rx="5" className="pod-art-outline" />
      <text x="146" y="26" className="pod-art-tiny">EPISODE</text>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={134 + i * 26} y="42" width="20" height="34" rx="4" className="pod-art-outline" />
      ))}
      <text x="216" y="64" className="pod-art-tiny">CLIPS 9:16</text>
      <rect x="134" y="86" width="120" height="26" rx="5" className="pod-art-outline" />
      <text x="146" y="104" className="pod-art-tiny">NOTES</text>
    </svg>
  );
}

/** Optimize — a retention curve with the drop-off called out. */
function OptimizeDiagram() {
  return (
    <svg {...diagramBox}>
      <path d="M20 14v88h284" className="pod-art-line" />
      <path
        d="M20 22c30 0 34 30 62 38 30 8 44 4 70 10 30 7 60 14 132 20"
        className="pod-art-line"
        fill="none"
        strokeWidth="3"
      />
      <circle cx="82" cy="60" r="7" className="pod-art-fill" />
      <path d="M82 60v-30" className="pod-art-line" strokeDasharray="3 4" />
      <text x="90" y="26" className="pod-art-tiny">DROP-OFF</text>
      {[
        { x: 24, t: "DISCOVERY" },
        { x: 104, t: "PACKAGING" },
        { x: 188, t: "CONSUMPTION" },
      ].map((l) => (
        <text key={l.t} x={l.x} y="118" className="pod-art-tiny">{l.t}</text>
      ))}
    </svg>
  );
}

export const STAGE_DIAGRAMS: Record<string, () => React.ReactElement> = {
  align: AlignDiagram,
  engineer: EngineerDiagram,
  amplify: AmplifyDiagram,
  optimize: OptimizeDiagram,
};

export function StageDiagram({ id }: { id: string }) {
  const D = STAGE_DIAGRAMS[id];
  return D ? <D /> : null;
}
