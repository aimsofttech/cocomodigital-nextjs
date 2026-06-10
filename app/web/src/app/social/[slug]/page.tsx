import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IoArrowBack } from "react-icons/io5";
import { HiArrowUpRight } from "react-icons/hi2";
import { getSocialPost, imageUrl } from "@/src/lib/content";
import { buildMetadata, truncate } from "@/src/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const PLATFORM_LABELS: Record<string, { label: string; emoji: string; viewLabel: string }> = {
  instagram: { label: "Instagram", emoji: "📸", viewLabel: "View on Instagram" },
  tiktok: { label: "TikTok", emoji: "🎵", viewLabel: "View on TikTok" },
  linkedin: { label: "LinkedIn", emoji: "💼", viewLabel: "View on LinkedIn" },
  threads: { label: "Threads", emoji: "🧵", viewLabel: "View on Threads" },
  x: { label: "X / Twitter", emoji: "𝕏", viewLabel: "View on X" },
  facebook: { label: "Facebook", emoji: "📘", viewLabel: "View on Facebook" },
  "youtube-shorts": { label: "YouTube Shorts", emoji: "▶️", viewLabel: "Watch on YouTube" },
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getSocialPost(slug);
  return buildMetadata({
    title: post?.title || "Social post",
    description: truncate(post?.caption || "A Cocoma Digital social post.", 160),
    path: `/social/${slug}`,
    image: post ? imageUrl(post) : undefined,
    category: "Social",
  });
}

/**
 * /social/[slug] — single social post detail.
 *
 * Layout: back link → platform pill → title → visual → caption →
 * hashtags → metrics strip → "View on Platform" CTA.
 *
 * The detail page is intentionally lightweight — most engagement
 * happens on the platform itself, so we surface the metric counts
 * + a clean CTA back to the live post rather than re-create the
 * full post UI.
 */
export default async function SocialDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getSocialPost(slug);
  if (!post) notFound();

  const img = imageUrl(post);
  const platformMeta =
    PLATFORM_LABELS[post.platform] || {
      label: post.platform || "Social",
      emoji: "📱",
      viewLabel: "View live post",
    };
  const scheduled = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const hashtags = (post.hashtags || "")
    .split(/\s+/)
    .filter((t: string) => t.startsWith("#"));
  const metrics = post.metrics || {};

  return (
    <article className="mx-auto w-full max-w-[720px] px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
      <Link
        href="/social"
        className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 transition hover:text-black"
      >
        <IoArrowBack aria-hidden="true" />
        All social
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
          <span aria-hidden="true">{platformMeta.emoji}</span>
          {platformMeta.label}
        </span>
        {scheduled && (
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {scheduled}
          </span>
        )}
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight font-primary sm:text-4xl">
        {post.title}
      </h1>

      {img && (
        <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200">
          { }
          <Image
            src={img}
            alt={post.title || ""}
            className="w-full object-cover"
            width={720}
            height={720}
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      )}

      {post.caption && (
        <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-neutral-800">
          {post.caption}
        </p>
      )}

      {hashtags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {hashtags.map((t: string) => (
            <span
              key={t}
              className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {(metrics.views || metrics.likes || metrics.comments || metrics.shares) && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Views" value={metrics.views} />
          <Metric label="Likes" value={metrics.likes} />
          <Metric label="Comments" value={metrics.comments} />
          <Metric label="Shares" value={metrics.shares} />
        </div>
      )}

      {post.external_url && (
        <Link
          href={post.external_url}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#fff000] px-4 py-2.5 text-sm font-semibold text-black shadow-[2px_2px_0_#000] transition hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#000]"
        >
          {platformMeta.viewLabel}
          <HiArrowUpRight aria-hidden="true" />
        </Link>
      )}

      <footer className="mt-16 border-t border-neutral-200 pt-6">
        <Link
          href="/social"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 transition hover:text-black"
        >
          <IoArrowBack aria-hidden="true" />
          Back to social feed
        </Link>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 text-center">
      <div className="text-2xl font-bold tabular-nums text-neutral-900 font-primary">
        {(value || 0).toLocaleString()}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
    </div>
  );
}
