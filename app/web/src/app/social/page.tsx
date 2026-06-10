import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getSocialPosts, imageUrl } from "@/src/lib/content";
import { buildMetadata } from "@/src/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Social — Cocoma Digital",
  description:
    "Cocoma's cross-platform social feed — Instagram, TikTok, LinkedIn, Threads, X, Facebook, YouTube Shorts.",
  path: "/social",
  category: "Social",
});

interface PageProps {
  searchParams: Promise<{ platform?: string }>;
}

const PLATFORMS: Array<{ id: string; label: string; emoji: string }> = [
  { id: "all", label: "All platforms", emoji: "🌐" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "linkedin", label: "LinkedIn", emoji: "💼" },
  { id: "threads", label: "Threads", emoji: "🧵" },
  { id: "x", label: "X / Twitter", emoji: "𝕏" },
  { id: "youtube-shorts", label: "YT Shorts", emoji: "▶️" },
];

const platformLabel = (id?: string): string => {
  const p = PLATFORMS.find((x) => x.id === id);
  return p ? `${p.emoji} ${p.label}` : id || "—";
};

/**
 * /social — public surface for the SocialPosts collection.
 *
 * Cross-platform feed in reverse-chronological order (latest
 * scheduled_at first). Platform filter chips above the grid. Each
 * card links to the detail page; the detail page in turn deep-links
 * to the live post on the actual platform via external_url.
 */
export default async function SocialListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const platform =
    sp.platform && PLATFORMS.some((p) => p.id === sp.platform)
      ? sp.platform
      : "all";

  const result = await getSocialPosts({
    where:
      platform === "all"
        ? undefined
        : { platform: { equals: platform } },
    depth: 1,
    limit: 60,
  });

  const docs = result.docs || [];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          What we&apos;re shipping across channels
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight font-primary sm:text-5xl">
          Social
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
          The cross-platform feed. Click any tile to open the live post on
          the platform it was shipped to.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const active = p.id === platform;
          return (
            <Link
              key={p.id}
              href={p.id === "all" ? "/social" : `/social?platform=${p.id}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
              }`}
            >
              <span aria-hidden="true">{p.emoji}</span>
              <span>{p.label}</span>
            </Link>
          );
        })}
      </div>

      {docs.length === 0 ? (
        <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-10 text-center">
          <p className="text-sm text-neutral-600">
            No posts match this filter yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {docs.map((post: any) => (
            <SocialCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function SocialCard({ post }: { post: any }) {
  const img = imageUrl(post);
  const scheduled = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;
  return (
    <Link
      href={`/social/${post.slug}`}
      className="group relative block overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-black hover:shadow-[3px_3px_0_#000]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        {img ? (
           
          <Image
            src={img}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-neutral-300">
            📱
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {platformLabel(post.platform)}
        </span>
      </div>
      <div className="p-3">
        <h2 className="line-clamp-2 text-sm font-semibold text-neutral-900">
          {post.title}
        </h2>
        {scheduled && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
            {scheduled}
          </p>
        )}
      </div>
    </Link>
  );
}
