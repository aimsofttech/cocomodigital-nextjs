/**
 * ContentLoader — Skeleton shown in the content area while a lazy page chunk loads.
 * The sidebar stays fully visible; only the right-side content area gets this placeholder.
 */

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-shimmer rounded-md ${className}`} style={style} />;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-1">
      <Bone className="h-4 w-8 flex-shrink-0" />
      <Bone className="h-4 flex-1" />
      <Bone className="h-4 w-24 flex-shrink-0" />
      <Bone className="h-4 w-16 flex-shrink-0" />
      <Bone className="h-6 w-14 rounded-full flex-shrink-0" />
      <div className="flex gap-1 flex-shrink-0">
        <Bone className="h-7 w-7 rounded-md" />
        <Bone className="h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

export default function ContentLoader() {
  return (
    <div className="space-y-6 animate-page-in">

      {/* ── Page header skeleton ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <Bone className="h-7 w-52" />
          <div className="flex gap-2">
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-4" />
            <Bone className="h-4 w-24" />
          </div>
        </div>
        <Bone className="h-9 w-28 rounded-lg flex-shrink-0" />
      </div>

      {/* ── Filter bar skeleton ──────────────────────────────── */}
      <Bone className="h-14 w-full rounded-xl" />

      {/* ── Table card skeleton ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* Search + header actions */}
        <div className="flex gap-3">
          <Bone className="h-9 w-72 rounded-lg" />
          <div className="flex-1" />
          <Bone className="h-9 w-20 rounded-lg" />
        </div>

        {/* Table header row */}
        <div className="flex gap-4 pb-3 border-b border-gray-100">
          {[52, 32, 24, 20, 16, 12].map((w, i) => (
            <Bone key={i} className={`h-3.5`} style={{ width: `${w}px` } as React.CSSProperties} />
          ))}
        </div>

        {/* Table data rows */}
        <div className="space-y-3.5 divide-y divide-gray-50">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={i > 0 ? 'pt-3.5' : ''}>
              <SkeletonRow />
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Bone className="h-4 w-44" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bone key={i} className="h-8 w-8 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
