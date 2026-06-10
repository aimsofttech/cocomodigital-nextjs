import { buildMetadata } from "@/src/lib/seo";
import JobApplicationForm from "@/src/views/Jobs/JobApplication";

export const metadata = buildMetadata({
  title: "Job Application",
  description: "Apply for an open role at Cocoma Digital.",
  path: "/job-application",
  category: "Careers",
  noIndex: true,
});

export default function Page() {
  return <JobApplicationForm />;
}
