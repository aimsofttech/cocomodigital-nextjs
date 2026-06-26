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

/* Wrap an array of raw values into the `{label}[]` shape JobCard's
   `joinLabels()` helper consumes, humanising each entry (snake_case
   enum codes → display text). Returns undefined for empty arrays so
   the chip group suppresses cleanly. */
const wrapEnumLabels = (v?: string[] | string | null) => {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  const labels = arr.map(humaniseEnum).filter(Boolean) as string[];
  return labels.length ? labels.map((label) => ({ label })) : undefined;
};

/* Same shape, but the values are already display-ready (experience
   labels are humanised upstream in content.ts) or a single scalar
   (location) — no enum humanising needed, just wrap. */
const wrapAsLabels = (v?: string[] | string | null) => {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return arr.length ? arr.map((label) => ({ label })) : undefined;
};

/* Adapter: the API job → the legacy shape the Career view's
   JobCard component expects. Field renames: title→job_title,
   slug→job_slug, etc. Once the JobCard is refactored to read
   the API shapes directly, this adapter goes away. */
const adaptJob = (j: any) => ({
  id: j.id,
  job_title: j.title,
  job_slug: j.slug,
  job_experience: wrapAsLabels(j.experience),
  job_type: wrapEnumLabels(j.job_type),
  workplace_type: wrapEnumLabels(j.work_type),
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
