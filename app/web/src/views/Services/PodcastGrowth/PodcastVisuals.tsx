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

/* Service + audience + operations iconography. Keyed by the `icon` field on
   each card record in the API so content and art stay decoupled — a name the
   registry does not know renders no icon, which is why the admin offers these
   as a closed list rather than free text. */
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

/* ------------------------------------------------------------------
   Problem section: one recording, two outcomes.

   The lead paragraph above this already names the four failure modes
   (episodes late, clips when someone has a spare afternoon, thumbnails
   by whoever is nearest, back catalog untouched). Prose makes a reader
   work to hold four parallel facts in their head; a side-by-side makes
   the same point in one glance, which is the whole reason this exists.

   Deliberately built from real elements rather than one flat SVG: the
   labels stay selectable, translatable and readable by a screen reader,
   and the layout can reflow to a single column on a phone. Only the
   tile grids are decorative, and those are aria-hidden.

   Every claim here is already made elsewhere on the page. The tiles are
   a texture for "a week of output", not a literal count — the numbers
   are carried by the labels. Note these strings are in code rather than
   the API, because they are part of the illustration; if they need to
   be editable, they want their own admin fields. */

const USUAL = [
  "Clips, if there is an afternoon spare",
  "Thumbnail by whoever is nearest the file",
  "Back catalog untouched",
];

const SYSTEM = [
  "Clips cut the same week, every week",
  "Thumbnail and title tested as a pair",
  "Back catalog re-cut and re-packaged",
];

function Tiles({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="pod-contrast-tiles" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            i < filled ? "pod-contrast-tile is-on" : "pod-contrast-tile"
          }
        />
      ))}
    </div>
  );
}

function MarkCross() {
  return (
    <svg viewBox="0 0 16 16" className="pod-contrast-mark" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function MarkCheck() {
  return (
    <svg viewBox="0 0 16 16" className="pod-contrast-mark" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function ProblemContrast() {
  return (
    <div className="pod-contrast">
      <p className="pod-contrast-source">
        <span className="pod-contrast-source-mark" aria-hidden="true">
          <Icon name="mic" />
        </span>
        One 60-minute recording
      </p>

      <div className="pod-contrast-tracks">
        <section className="pod-contrast-track" aria-label="Without a system">
          <p className="pod-contrast-kicker">Without a system</p>
          <Tiles filled={1} total={18} />
          <p className="pod-contrast-out">
            <strong>1 episode</strong>, often late
          </p>
          <ul className="pod-contrast-list">
            {USUAL.map((t) => (
              <li key={t}>
                <MarkCross />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="pod-contrast-track pod-contrast-track--system"
          aria-label="Run as a system"
        >
          <p className="pod-contrast-kicker">Run as a system</p>
          <Tiles filled={18} total={18} />
          <p className="pod-contrast-out">
            <strong>60+ pieces</strong>, every week
          </p>
          <ul className="pod-contrast-list">
            {SYSTEM.map((t) => (
              <li key={t}>
                <MarkCheck />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Audience illustrations.

   The three audience cards were a heading, a paragraph and a one-line
   signal — true, and completely flat. Each of these draws the shape of
   that reader's operation rather than decorating the card: one show
   feeding a business, one brand feeding several platforms, several shows
   sharing one production spine.

   Same schematic language as the Signal-to-Scale diagrams (same viewBox,
   same pod-art-* classes) so the page reads as one hand. Decorative by
   construction — the card's own words carry the meaning — so they are
   aria-hidden and carry no text a screen reader would need. */

const audienceBox = {
  viewBox: "0 0 320 132",
  role: "presentation" as const,
  "aria-hidden": true as const,
  focusable: "false" as const,
  className: "pod-audience-art",
};

/* One show, pointed at a business outcome. */
function FounderArt() {
  return (
    <svg {...audienceBox}>
      <circle cx="46" cy="46" r="15" className="pod-art-outline" />
      <path d="M46 61v10M34 71h24" className="pod-art-line" />
      <rect x="30" y="80" width="32" height="26" rx="5" className="pod-art-fill" />
      <text x="46" y="97" className="pod-art-tiny" textAnchor="middle">SHOW</text>
      <path d="M70 93h34" className="pod-art-line" />
      <path d="M112 100l26-14 24 8 30-26 28-12" className="pod-art-line" />
      {[
        [138, 86],
        [162, 94],
        [192, 68],
        [220, 56],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="3.5" className="pod-art-fill" />
      ))}
      <rect x="240" y="34" width="64" height="24" rx="5" className="pod-art-outline" />
      <text x="272" y="49" className="pod-art-tiny" textAnchor="middle">PIPELINE</text>
      <path d="M112 112h192" className="pod-art-line" opacity="0.3" />
    </svg>
  );
}

/* One brand, several platforms, measured. */
function BrandArt() {
  return (
    <svg {...audienceBox}>
      <rect x="14" y="48" width="58" height="36" rx="6" className="pod-art-fill" />
      <text x="43" y="70" className="pod-art-tiny" textAnchor="middle">BRAND</text>
      <path d="M72 66h26M98 66V26h18M98 66v40h18M98 66h18" className="pod-art-line" />
      {[
        { y: 14, label: "YOUTUBE" },
        { y: 54, label: "SHORTS" },
        { y: 94, label: "SOCIAL" },
      ].map((r) => (
        <g key={r.y}>
          <rect x="116" y={r.y} width="86" height="24" rx="5" className="pod-art-outline" />
          <text x="159" y={r.y + 16} className="pod-art-tiny" textAnchor="middle">{r.label}</text>
          <path d={`M202 ${r.y + 12}h28`} className="pod-art-line" opacity="0.5" />
        </g>
      ))}
      <rect x="232" y="42" width="72" height="48" rx="6" className="pod-art-outline" />
      <path d="M244 78l14-12 12 8 20-22" className="pod-art-line" />
      <text x="268" y="102" className="pod-art-tiny" textAnchor="middle">MEASURED</text>
    </svg>
  );
}

/* Several shows, one production spine. */
function NetworkArt() {
  return (
    <svg {...audienceBox}>
      {[16, 54, 92].map((y, i) => (
        <g key={y}>
          <rect x="14" y={y} width="74" height="26" rx="5" className="pod-art-outline" />
          <text x="51" y={y + 17} className="pod-art-tiny" textAnchor="middle">
            {`SHOW ${i + 1}`}
          </text>
          <path d={`M88 ${y + 13}h34`} className="pod-art-line" />
        </g>
      ))}
      <path d="M122 29v76" className="pod-art-line" />
      <rect x="122" y="40" width="74" height="52" rx="6" className="pod-art-fill" />
      <text x="159" y="62" className="pod-art-tiny" textAnchor="middle">ONE</text>
      <text x="159" y="78" className="pod-art-tiny" textAnchor="middle">STANDARD</text>
      <path d="M196 66h30" className="pod-art-line" />
      {[
        { y: 22, label: "CATALOG" },
        { y: 56, label: "LANGUAGES" },
        { y: 90, label: "REPORTING" },
      ].map((r) => (
        <g key={r.y}>
          <rect x="226" y={r.y} width="78" height="22" rx="5" className="pod-art-outline" />
          <text x="265" y={r.y + 15} className="pod-art-tiny" textAnchor="middle">{r.label}</text>
        </g>
      ))}
      <path d="M226 33h-14v33h14M212 66v35h14" className="pod-art-line" opacity="0.45" />
    </svg>
  );
}

export const AUDIENCE_ART: Record<string, () => React.ReactElement> = {
  mic: FounderArt,
  brand: BrandArt,
  network: NetworkArt,
};

/** Falls back to nothing when an editor picks an icon we have no scene for. */
export function AudienceArt({ id }: { id: string }) {
  const Art = AUDIENCE_ART[id];
  return Art ? <Art /> : null;
}
