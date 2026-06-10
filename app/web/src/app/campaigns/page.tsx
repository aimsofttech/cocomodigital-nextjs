import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getCampaigns, imageUrl } from "@/src/lib/content";
import { buildMetadata } from "@/src/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Campaigns — Cocoma Digital",
  description:
    "Timeline-based creative + marketing projects in flight at Cocoma. From planning to launch, with milestones along the way.",
  path: "/campaigns",
  category: "Campaigns",
});

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "planning", label: "Planning" },
  { id: "completed", label: "Completed" },
];

/**
 * /campaigns — public surface for the Campaigns collection.
 *
 * Phase 6 launch. Card grid filtered by lifecycle_status. SSR with
 * a 5-min ISR (revalidate via getCampaigns default) so the live
 * page reflects Studio publishes without long stale windows.
 */
export default async function CampaignsListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status =
    sp.status && STATUS_FILTERS.some((f) => f.id === sp.status)
      ? sp.status
      : "all";

  const result = await getCampaigns({
    where:
      status === "all"
        ? undefined
        : { lifecycle_status: { equals: status } },
    depth: 1,
    limit: 50,
  });

  const docs = result.docs || [];

  return (
    <div className="campaigns-list-wrapper mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          What we&apos;re working on
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight font-primary sm:text-5xl">
          Campaigns
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
          Timeline-based projects spanning creative + marketing. From planning
          through launch, with the milestones we&apos;re steering toward.
        </p>
      </header>

      <FilterChips current={status} />

      {docs.length === 0 ? (
        <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-10 text-center">
          <p className="text-sm text-neutral-600">
            No campaigns match this filter.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((c: any) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChips({ current }: { current: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTERS.map((f) => {
        const active = f.id === current;
        return (
          <Link
            key={f.id}
            href={f.id === "all" ? "/campaigns" : `/campaigns?status=${f.id}`}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              active
                ? "border-black bg-black text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
            }`}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: any }) {
  const img = imageUrl(campaign);
  const dateRange = formatDateRange(campaign.start_date, campaign.end_date);
  return (
    <Link
      href={`/campaigns/${campaign.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-black hover:shadow-[3px_3px_0_#000]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
        {img ? (
           
          <Image
            src={img}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-neutral-300">
            🎯
          </div>
        )}
        <StatusBadge status={campaign.lifecycle_status} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {dateRange && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            {dateRange}
          </p>
        )}
        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-neutral-900 font-primary">
          {campaign.title}
        </h2>
        {campaign.summary && (
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-neutral-600">
            {campaign.summary}
          </p>
        )}
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "planning") {
    return (
      <span className="absolute left-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-700 shadow">
        Planning
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
        <span className="block h-1.5 w-1.5 rounded-full bg-white" />
        Active
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black shadow">
        Paused
      </span>
    );
  }
  return (
    <span className="absolute left-3 top-3 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-700 shadow">
      Completed
    </span>
  );
}

const formatDate = (raw?: string): string | null => {
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

const formatDateRange = (start?: string, end?: string): string | null => {
  const a = formatDate(start);
  const b = formatDate(end);
  if (a && b) return `${a} → ${b}`;
  if (a) return `From ${a}`;
  if (b) return `Through ${b}`;
  return null;
};
