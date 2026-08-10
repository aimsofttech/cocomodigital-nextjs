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
      className="w-full rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)] sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EE2B2C] text-white">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          {title}
        </p>
        {control ? (
          <span className="rounded-md border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500">
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
    <div className="rounded-lg border border-neutral-200 p-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500">
        <Icon className="h-3 w-3 text-[#EE2B2C]" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 text-base leading-none font-bold text-neutral-900">{value}</p>
      {delta ? (
        <p className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
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
    <div className={`rounded-lg border border-neutral-200 p-2.5 ${className}`}>
      {title ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-neutral-700">{title}</p>
          {action ? <span className="text-[10px] text-[#EE2B2C]">{action}</span> : null}
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
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EE2B2C" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#EE2B2C" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1="0"
            x2="300"
            y1={12 + row * 28}
            y2={12 + row * 28}
            className="stroke-neutral-100"
            strokeWidth="1"
          />
        ))}

        <polygon points={`0,110 ${points} 300,110`} fill={`url(#${gradientId})`} />
        <polyline
          points={points}
          className="fill-none stroke-[#EE2B2C]"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.split(" ").map((point) => {
          const [x, y] = point.split(",");
          return <circle key={point} cx={x} cy={y} r="3" className="fill-[#EE2B2C]" />;
        })}
      </svg>

      <ul className="mt-1.5 flex justify-between text-[9px] text-neutral-400">
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
          className={`w-full rounded-sm bg-[#EE2B2C]/70 ${BAR_HEIGHTS[height] ?? "h-4"}`}
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
          className={`w-[3px] shrink-0 rounded-full bg-[#EE2B2C]/70 ${
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
        className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-linear-to-br from-neutral-200 to-neutral-300 text-[9px] font-bold text-neutral-500"
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-medium text-neutral-800">{title}</span>
        <span className="block truncate text-[9px] text-neutral-400">{meta}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[10px] font-semibold text-neutral-900">{value}</span>
        {trend ? <span className="block text-[9px] text-emerald-600">{trend}</span> : null}
      </span>
    </li>
  );
}
