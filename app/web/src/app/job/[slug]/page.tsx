import type { Metadata } from "next";
import JobDetails from "@/src/views/Jobs/JobDetails/JobDetails";
import { getJob } from "@/src/lib/content";
import { buildMetadata, truncate } from "@/src/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);

  /* the API's description is a Lexical rich-text tree; for metadata
     we use the title as the description fallback. A future pass can
     extract plain text from the Lexical tree (same walker used in
     scripts/migrate-laravel/lib/htmlToLexical.ts). */
  return buildMetadata({
    title: job?.title || "Job Opening",
    description: truncate(
      job?.title
        ? `${job.title} — open role at Cocoma Digital.`
        : "Explore this open role at Cocoma Digital.",
    ),
    path: `/job/${slug}`,
    category: "Careers",
  });
}

export default function Page() {
  return <JobDetails />;
}
