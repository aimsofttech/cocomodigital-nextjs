import { FiArrowUpRight } from "react-icons/fi";
import type { IconType } from "react-icons";
import type { ReactNode } from "react";

/* Building blocks for the hero "product dashboard" mock-ups.
   Everything is real markup + SVG rather than a screenshot, so
   the mocks stay crisp at any density and reflow on mobile.

   Bar heights come from a fixed class lookup instead of inline
   styles — Tailwind needs to see complete class names, and these
   pages ship without any custom CSS. */

export const BAR_HEIGHTS = [
  "h-1",
  "h-2",
  "h-3",
  "h-4",
  "h-5",
  "h-6",
  "h-7",
  "h-8",
  "h-9",
  "h-10",
  "h-11",
  "h-12",
] as const;

export const WIDTH_STEPS: Record<number, string> = {
  10: "w-[10%]",
  20: "w-[20%]",
  28: "w-[28%]",
  42: "w-[42%]",
  54: "w-[54%]",
  61: "w-[61%]",
  85: "w-[85%]",
};

/* ── Outer shell ──────────────────────────────────────────── */

export function DashboardShell({
  icon: Icon,
  title,
  control,
  children,
}: {
  icon: IconType;
  title: string;
  control?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={`${title} preview`}
      /* Outer frame carries the full sticker treatment; inner panels below
         use a hairline so the mock keeps a clear depth hierarchy. */
      className="w-full rounded-sticker border-2 border-strong bg-page p-3 shadow-[6px_6px_0_var(--brand,#fff000)] sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-black text-strong">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm border-2 border-strong bg-brand text-brand-on">
            <Icon className="h-3 w-3" aria-hidden="true" />
          </span>
          {title}
        </p>
        {control ? (
          <span className="rounded-pill border border-strong/20 px-2.5 py-1 text-[11px] font-bold text-muted">
            {control}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/* ── KPI tile ─────────────────────────────────────────────── */

export function MiniStat({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: IconType;
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="rounded-sticker border border-strong/15 bg-page-soft p-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
        <Icon className="h-3 w-3 text-strong" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 text-base leading-none font-black text-strong">{value}</p>
      {delta ? (
        /* The arrow already carries "up"; colour is left to the theme so the
           mock doesn't introduce a green that appears nowhere else. */
        <p className="mt-1 flex items-center gap-0.5 text-[10px] font-black text-strong">
          <FiArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
          {delta}
        </p>
      ) : null}
    </div>
  );
}

/* ── Inner panel ──────────────────────────────────────────── */

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-sticker border border-strong/15 p-2.5 ${className}`}>
      {title ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-black text-body">{title}</p>
          {action ? (
            <span className="text-[10px] font-bold text-strong underline decoration-brand decoration-2 underline-offset-2">
              {action}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/* ── Line chart ───────────────────────────────────────────── */

export function LineChart({
  points,
  gradientId,
  labels,
}: {
  points: string;
  gradientId: string;
  labels: string[];
}) {
  return (
    <div>
      <svg
        viewBox="0 0 300 110"
        className="h-24 w-full sm:h-28"
        role="presentation"
        focusable="false"
      >
        <defs>
          {/* Brand yellow fills the area; the line itself stays near-black so
              the series is readable against a white panel. Written as an
              arbitrary property so the token resolves, not a literal hex. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="[stop-color:var(--brand,#fff000)]" stopOpacity="0.85" />
            <stop offset="100%" className="[stop-color:var(--brand,#fff000)]" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1="0"
            x2="300"
            y1={12 + row * 28}
            y2={12 + row * 28}
            className="stroke-strong/10"
            strokeWidth="1"
          />
        ))}

        <polygon points={`0,110 ${points} 300,110`} fill={`url(#${gradientId})`} />
        <polyline
          points={points}
          className="fill-none stroke-strong"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.split(" ").map((point) => {
          const [x, y] = point.split(",");
          return <circle key={point} cx={x} cy={y} r="3" className="fill-strong" />;
        })}
      </svg>

      <ul className="mt-1.5 flex justify-between text-[9px] font-bold text-subtle">
        {labels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  );
}

/* ── Bar chart ────────────────────────────────────────────── */

export function BarChart({ heights }: { heights: number[] }) {
  return (
    <div className="flex h-12 items-end gap-1" role="presentation">
      {heights.map((height, index) => (
        <span
          key={index}
          className={`w-full rounded-sm bg-strong/85 ${BAR_HEIGHTS[height] ?? "h-4"}`}
        />
      ))}
    </div>
  );
}

/* ── Audio waveform ───────────────────────────────────────── */

export function Waveform({ pattern, className = "" }: { pattern: number[]; className?: string }) {
  return (
    <div className={`flex h-10 items-center gap-[3px] ${className}`} role="presentation">
      {pattern.map((amplitude, index) => (
        <span
          key={index}
          className={`w-[3px] shrink-0 rounded-full bg-strong/70 ${
            BAR_HEIGHTS[amplitude] ?? "h-3"
          }`}
        />
      ))}
    </div>
  );
}

/* Repeating amplitude pattern reused by the podcast waveforms. */
export const WAVE_PATTERN = [
  2, 4, 7, 3, 9, 5, 8, 2, 6, 10, 4, 7, 3, 8, 5, 9, 2, 6, 4, 8, 3, 7, 10, 4, 6, 2, 8, 5, 9, 3, 7, 4,
  8, 2, 6, 9, 3, 7, 5, 4,
];

/* ── List row (top episodes / top videos) ─────────────────── */

export function ListRow({
  rank,
  title,
  meta,
  value,
  trend,
}: {
  rank: number;
  title: string;
  meta: string;
  value: string;
  trend?: string;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      <span
        aria-hidden="true"
        className="flex h-7 w-10 shrink-0 items-center justify-center rounded-sm border border-strong/20 bg-brand text-[9px] font-black text-brand-on"
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-bold text-strong">{title}</span>
        <span className="block truncate text-[9px] text-subtle">{meta}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[10px] font-black text-strong">{value}</span>
        {trend ? <span className="block text-[9px] font-bold text-muted">{trend}</span> : null}
      </span>
    </li>
  );
}
