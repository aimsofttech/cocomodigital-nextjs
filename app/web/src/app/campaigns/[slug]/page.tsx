import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IoArrowBack } from "react-icons/io5";
import { getCampaign, imageUrl } from "@/src/lib/content";
import { buildMetadata, truncate } from "@/src/lib/seo";
import MarkdownBody from "@/src/components/common/MarkdownBody/MarkdownBody";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  return buildMetadata({
    title: campaign?.title || "Campaign",
    description: truncate(
      campaign?.summary ||
        "A creative + marketing campaign by Cocoma Digital.",
      160,
    ),
    path: `/campaigns/${slug}`,
    image: campaign ? imageUrl(campaign) : undefined,
    category: "Campaigns",
  });
}

/**
 * /campaigns/[slug] — campaign detail page.
 *
 * Layout: back link → status pill + date range eyebrow → title +
 * summary → hero image → milestones timeline → brief body
 * (markdown) → footer back-to-list.
 *
 * Timeline component is intentionally simple — vertical list of
 * milestones with completed ✓ markers. Editors add milestones in
 * Studio; reordering happens by the date sort below.
 */
export default async function CampaignDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) notFound();

  const heroImg = imageUrl(campaign);
  const dateRange = formatDateRange(campaign.start_date, campaign.end_date);
  const milestones = Array.isArray(campaign.milestones)
    ? [...campaign.milestones].sort(byMilestoneDate)
    : [];

  return (
    <article className="mx-auto w-full max-w-[920px] px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 transition hover:text-black"
      >
        <IoArrowBack aria-hidden="true" />
        All campaigns
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={campaign.lifecycle_status} />
          {dateRange && (
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {dateRange}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight font-primary sm:text-5xl">
          {campaign.title}
        </h1>
        {campaign.summary && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-700">
            {campaign.summary}
          </p>
        )}
      </header>

      {heroImg && (
        <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200">
          { }
          <Image
            src={heroImg}
            alt={campaign.title || ""}
            className="aspect-video w-full object-cover"
            width={920}
            height={517}
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      )}

      {milestones.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Milestones
          </h2>
          <ol className="mt-4 space-y-3 border-l-2 border-neutral-200 pl-5">
            {milestones.map((m: any, i: number) => (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[26px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full ${
                    m.completed
                      ? "bg-[#fff000] text-black shadow-[1px_1px_0_#000]"
                      : "border-2 border-neutral-300 bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {m.completed && <span className="text-[9px]">✓</span>}
                </span>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-base font-semibold text-neutral-900">
                    {m.title}
                  </h3>
                  {m.date && (
                    <span className="text-xs text-neutral-500">
                      {formatDate(m.date)}
                    </span>
                  )}
                </div>
                {m.description && (
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                    {m.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {campaign.body_markdown && (
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Brief
          </h2>
          <MarkdownBody
            source={campaign.body_markdown}
            className="prose mt-3 max-w-none prose-headings:font-primary"
          />
        </section>
      )}

      <footer className="mt-16 border-t border-neutral-200 pt-6">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 transition hover:text-black"
        >
          <IoArrowBack aria-hidden="true" />
          Back to all campaigns
        </Link>
      </footer>
    </article>
  );
}

function StatusPill({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    planning: {
      label: "Planning",
      cls: "bg-neutral-200 text-neutral-700",
    },
    active: {
      label: "Active",
      cls: "bg-green-500 text-white",
    },
    paused: {
      label: "Paused",
      cls: "bg-amber-400 text-black",
    },
    completed: {
      label: "Completed",
      cls: "bg-neutral-900 text-white",
    },
  };
  const s = map[status || "planning"] || map.planning;
  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${s.cls}`}
    >
      {s.label}
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

const byMilestoneDate = (a: any, b: any): number => {
  const aT = a?.date ? Date.parse(a.date) : 0;
  const bT = b?.date ? Date.parse(b.date) : 0;
  return aT - bT;
};
