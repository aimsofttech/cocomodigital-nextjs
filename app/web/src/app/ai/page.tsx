import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAIShowcases, imageUrl } from "@/src/lib/content";
import { buildMetadata } from "@/src/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI showcases — Cocoma Digital",
  description:
    "How Cocoma uses AI to ship faster, cheaper, and better. Workflow case studies with the tools, prompts, and outcomes we shipped.",
  path: "/ai",
  category: "AI",
});

/**
 * /ai — public surface for the AIShowcases collection.
 *
 * Process-focused (not client-facing): "here's how we built it +
 * which tools + what the before/after looked like". Reads more
 * like an engineering blog grid than a portfolio.
 */
export default async function AIShowcasesListPage() {
  const result = await getAIShowcases({ depth: 1, limit: 40 });
  const docs = result.docs || [];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          How we build with AI
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight font-primary sm:text-5xl">
          AI showcases
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
          Workflow case studies — what we built, which tools we stacked, and
          the before/after numbers. Written for builders, not buyers.
        </p>
      </header>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-10 text-center">
          <p className="text-sm text-neutral-600">No AI showcases yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc: any) => (
            <ShowcaseCard key={doc.id} showcase={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShowcaseCard({ showcase }: { showcase: any }) {
  const img = imageUrl(showcase);
  const tools = (showcase.tools_used || "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
  return (
    <Link
      href={`/ai/${showcase.slug}`}
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
            🤖
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-neutral-900 font-primary">
          {showcase.title}
        </h2>
        {showcase.workflow_description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
            {showcase.workflow_description}
          </p>
        )}
        {tools.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5">
            {tools.map((t: string) => (
              <span
                key={t}
                className="rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
