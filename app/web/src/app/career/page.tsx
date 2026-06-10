import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import Career from "@/src/views/Jobs/Career/Career";
import { getJobs, getJobCategories, findCollection } from "@/src/lib/content";

export const metadata = buildMetadata(getStaticSeo("/career"));

/* Humanise a snake_case enum value into a display label.
   `full_time` → "Full Time", `on_site` → "On-site". Falls back to
   title-casing each segment. */
const humaniseEnum = (v?: string | null): string | null => {
  if (!v || typeof v !== "string") return null;
  const overrides: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    on_site: "On-Site",
  };
  if (overrides[v]) return overrides[v];
  return v
    .split(/[_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
};

/* Wrap a scalar enum/text value as an array of `{label}` entries —
   the shape JobCard's `joinLabels()` helper consumes. JobCard
   was designed for multi-select fields (admin can pick multiple
   job_types per role) so it iterates an array. Our schema today
   stores single-select strings, so we singleton-wrap. Returns
   undefined for empty values so the chip suppresses cleanly. */
const wrapAsLabels = (v?: string | null) => {
  const label = humaniseEnum(v);
  return label ? [{ label }] : undefined;
};

/* Adapter: the API job → the legacy shape the Career view's
   JobCard component expects. Field renames: title→job_title,
   slug→job_slug, etc. Once the JobCard is refactored to read
   the API shapes directly, this adapter goes away.
   Phase 5+ 2026-05-22: previously passed scalar strings for
   job_type / workplace_type / job_location, but JobCard expected
   array-of-`{label}` (legacy multi-select shape) and silently
   suppressed all three chips. Wrap each via wrapAsLabels so the
   chips render. */
const adaptJob = (j: any) => ({
  id: j.id,
  job_title: j.title,
  job_slug: j.slug,
  job_experience: j.experience,
  job_type: wrapAsLabels(j.job_type),
  workplace_type: wrapAsLabels(j.work_type),
  job_location: wrapAsLabels(j.location),
  job_salary: j.salary_range,
  display_order: j.order,
  category_name:
    typeof j.department === "object" ? j.department?.name : undefined,
  category_slug:
    typeof j.department === "object" ? j.department?.slug : undefined,
});

/* Adapter: the API job-category → legacy shape used by CustomSelect.
   The view expects { id, category_name, category_slug }. */
const adaptCategory = (c: any) => ({
  id: c.id,
  category_name: c.name,
  category_slug: c.slug,
  /* CustomSelect uses `slug` as the value to filter on, which the
     server's getJobList API filters by. */
  slug: c.slug,
  name: c.name,
});

export default async function Page() {
  /* Pull active jobs + job categories in parallel. Active-only
     filter is baked into getJobs() — the API's where[is_active]=
     true is applied for us. */
  const [jobsResult, categoriesResult] = await Promise.all([
    getJobs({ limit: 30, depth: 1 }),
    getJobCategories(),
  ]);

  const initialJobs = jobsResult.docs.map(adaptJob);
  const initialJobCategories = categoriesResult.docs.map(adaptCategory);

  return (
    <Career
      initialJobs={initialJobs}
      initialJobCategories={initialJobCategories}
      initialTotal={jobsResult.totalDocs}
    />
  );
}
