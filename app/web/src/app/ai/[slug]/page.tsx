import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IoArrowBack } from "react-icons/io5";
import { getAIShowcase, imageUrl } from "@/src/lib/content";
import { buildMetadata, truncate } from "@/src/lib/seo";
import MarkdownBody from "@/src/components/common/MarkdownBody/MarkdownBody";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getAIShowcase(slug);
  return buildMetadata({
    title: doc?.title || "AI showcase",
    description: truncate(
      doc?.workflow_description ||
        "How Cocoma uses AI to ship faster, cheaper, and better.",
      160,
    ),
    path: `/ai/${slug}`,
    image: doc ? imageUrl(doc) : undefined,
    category: "AI",
  });
}

/**
 * /ai/[slug] — single AI showcase detail.
 *
 * Layout: back → title + pitch → hero → tools-used chips → body
 * (markdown) → outcomes block → back-to-list.
 *
 * Tools-used renders as chips (split on commas) so editors can
 * just type "Claude, Midjourney, Runway" in Studio without learning
 * a chip widget.
 */
export default async function AIShowcaseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getAIShowcase(slug);
  if (!doc) notFound();

  const heroImg = imageUrl(doc);
  const tools = (doc.tools_used || "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto w-full max-w-[920px] px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
      <Link
        href="/ai"
        className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 transition hover:text-black"
      >
        <IoArrowBack aria-hidden="true" />
        All AI showcases
      </Link>

      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          🤖 AI Showcase
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight font-primary sm:text-5xl">
          {doc.title}
        </h1>
        {doc.workflow_description && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-700">
            {doc.workflow_description}
          </p>
        )}
      </header>

      {heroImg && (
        <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200">
          { }
          <Image
            src={heroImg}
            alt={doc.title || ""}
            className="aspect-video w-full object-cover"
            width={920}
            height={517}
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      )}

      {tools.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Stack
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tools.map((t: string) => (
              <span
                key={t}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-[1px_1px_0_#000]"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {doc.body_markdown && (
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            How it works
          </h2>
          <MarkdownBody
            source={doc.body_markdown}
            className="prose mt-3 max-w-none prose-headings:font-primary"
          />
        </section>
      )}

      {doc.outcome_summary && (
        <section className="mt-12 rounded-lg border-2 border-black bg-[#fff000] p-6 shadow-[4px_4px_0_#000]">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black">
            Outcomes
          </h2>
          <p className="mt-3 whitespace-pre-line text-lg font-medium leading-relaxed text-black">
            {doc.outcome_summary}
          </p>
        </section>
      )}

      <footer className="mt-16 border-t border-neutral-200 pt-6">
        <Link
          href="/ai"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 transition hover:text-black"
        >
          <IoArrowBack aria-hidden="true" />
          Back to all AI showcases
        </Link>
      </footer>
    </article>
  );
}
