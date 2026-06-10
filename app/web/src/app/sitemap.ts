import type { MetadataRoute } from "next";
import {
  getAIShowcases,
  getBlogPosts,
  getCampaigns,
  getCreativeHouseItems,
  getDepartments,
  getJobs,
  getMarketingHouseItems,
  getServices,
  getSocialPosts,
  getSolutionsPages,
} from "@/src/lib/content";
import blogManifest from "@/src/content/blog.generated.json";
import { SITE_URL, staticSeoPaths } from "@/src/lib/seo";

/**
 * Generic shape used by APIs that return SEO-relevant items.
 */
interface SlugItem {
  slug?: string;
  updated_at?: string;
  created_at?: string;
  date?: string;
  image?: string;
  title?: string;
}

/**
 * Static markdown blog manifest structure.
 */
interface BlogManifest {
  posts?: SlugItem[];
}

/**
 * Supported change frequency values.
 */
type ChangeFrequency =
  MetadataRoute.Sitemap[number]["changeFrequency"];

/**
 * Default timestamp used as a fallback.
 */
const NOW = new Date();

/**
 * Default values used across sitemap entries.
 */
const DEFAULTS = {
  homePriority: 1.0,
  pagePriority: 0.7,
  detailPriority: 0.75,
  servicePriority: 0.85,
  groupPriority: 0.8,
  jobPriority: 0.5,
  staticFrequency: "weekly" as ChangeFrequency,
  blogFrequency: "monthly" as ChangeFrequency,
};

/**
 * Resolve a valid lastModified value from an item.
 */
function getLastModified(item?: SlugItem): string | Date {
  return (
    item?.updated_at ||
    item?.date ||
    item?.created_at ||
    NOW
  );
}

/**
 * Normalize paths to avoid double slashes.
 */
function normalizePath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

/**
 * Create a sitemap entry.
 */
function createEntry(
  path: string,
  priority: number,
  changeFrequency: ChangeFrequency = DEFAULTS.staticFrequency,
  lastModified: string | Date = NOW
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${normalizePath(path)}`,
    lastModified,
    changeFrequency,
    priority,
  };
}

/**
 * Push a new sitemap entry only if the slug exists.
 */
function addSlugEntry(
  entries: MetadataRoute.Sitemap,
  basePath: string,
  item: SlugItem,
  priority: number,
  changeFrequency: ChangeFrequency
) {
  if (!item.slug) return;

  entries.push(
    createEntry(
      `${basePath}/${item.slug}`,
      priority,
      changeFrequency,
      getLastModified(item)
    )
  );
}

/**
 * Generate sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /**
   * Fetch all SEO-relevant data in parallel from the API.
   * Any failed request resolves to an empty list so sitemap
   * generation still succeeds with partial data.
   *
   * Phase 5h: pure the API, zero Laravel reads. The legacy
   * Laravel endpoints (/common-api, /service_detail, /blog_item,
   * /marketing_house_item, /creative_house_item, /job/get_job_list)
   * have been replaced by their the API collection equivalents.
   * /service and /services share the same slug list — the API's
   * services collection covers both URL roots; the legacy split
   * (services as flat list vs service groups) collapses here.
   */
  const adaptSlugItem = (d: any): SlugItem => ({
    slug: d?.slug,
    updated_at: d?.updatedAt,
    created_at: d?.createdAt,
    title: d?.title,
  });

  const [
    servicesResult,
    blogPostsResult,
    marketingResult,
    creativeResult,
    jobsResult,
    campaignsResult,
    socialResult,
    aiResult,
    departmentsResult,
  ] = await Promise.all([
    getServices({ limit: 200 }).catch(() => ({ docs: [] })),
    getBlogPosts({ limit: 200 }).catch(() => ({ docs: [] })),
    getMarketingHouseItems({ limit: 1000 }).catch(() => ({ docs: [] })),
    getCreativeHouseItems({ limit: 1000 }).catch(() => ({ docs: [] })),
    getJobs({ limit: 100 }).catch(() => ({ docs: [] })),
    /* Phase 6 Studio public surfaces 2026-05-24. */
    getCampaigns({ limit: 500 }).catch(() => ({ docs: [] })),
    getSocialPosts({ limit: 1000 }).catch(() => ({ docs: [] })),
    getAIShowcases({ limit: 200 }).catch(() => ({ docs: [] })),
    getDepartments({ limit: 20 }).catch(() => ({ docs: [] })),
  ]);
  /* Phase 8b 2026-05-25: solutions now the API-driven. */
  const solutionsResult = await getSolutionsPages({
    limit: 50,
    depth: 0,
  }).catch(() => ({ docs: [] }));

  const serviceItems: SlugItem[] = (servicesResult.docs || []).map(adaptSlugItem);
  const serviceGroups: SlugItem[] = serviceItems;
  const apiBlogs = {
    blogItems: (blogPostsResult.docs || []).map((p: any) => ({
      ...adaptSlugItem(p),
      date: p?.published_at,
    })),
  };
  const marketingItems: SlugItem[] = (marketingResult.docs || []).map(
    adaptSlugItem,
  );
  const creativeItems: SlugItem[] = (creativeResult.docs || []).map(
    adaptSlugItem,
  );
  const jobItems: SlugItem[] = (jobsResult.docs || []).map(adaptSlugItem);
  const campaignItems: SlugItem[] = (campaignsResult.docs || []).map(adaptSlugItem);
  const socialItems: SlugItem[] = (socialResult.docs || []).map(adaptSlugItem);
  const aiItems: SlugItem[] = (aiResult.docs || []).map(adaptSlugItem);
  const departmentItems: SlugItem[] = (departmentsResult.docs || []).map(adaptSlugItem);

  const entries: MetadataRoute.Sitemap = [];

  /**
   * Phase 6 Studio public surfaces — index pages.
   * Each lives outside staticPageSeo so add them here directly.
   */
  for (const path of ["/campaigns", "/social", "/ai"]) {
    entries.push(
      createEntry(path, DEFAULTS.pagePriority, DEFAULTS.staticFrequency),
    );
  }

  /**
   * Static pages
   */
  for (const path of staticSeoPaths) {
    entries.push(
      createEntry(
        path,
        path === "/" ? DEFAULTS.homePriority : DEFAULTS.pagePriority,
        DEFAULTS.staticFrequency
      )
    );
  }

  /**
   * /service/[slug]
   */
  for (const item of serviceItems) {
    addSlugEntry(
      entries,
      "/service",
      item,
      DEFAULTS.servicePriority,
      DEFAULTS.staticFrequency
    );
  }

  /**
   * /services/[slug] — same the API services collection feeds the
   * group-page URL root too (every service has both URLs).
   */
  for (const item of serviceGroups) {
    addSlugEntry(
      entries,
      "/services",
      item,
      DEFAULTS.groupPriority,
      DEFAULTS.staticFrequency
    );
  }

  /**
   * /blog/[slug]
   * Merge markdown + API blogs and remove duplicates.
   */
  const manifestPosts =
    ((blogManifest as BlogManifest)?.posts ?? []);

  const mergedBlogs = [
    ...manifestPosts,
    ...(apiBlogs?.blogItems ?? []),
  ];

  const seenBlogSlugs = new Set<string>();

  for (const post of mergedBlogs) {
    if (!post.slug || seenBlogSlugs.has(post.slug)) continue;

    seenBlogSlugs.add(post.slug);

    addSlugEntry(
      entries,
      "/blog",
      post,
      DEFAULTS.detailPriority,
      DEFAULTS.blogFrequency
    );
  }

  /**
   * /marketing/[slug]
   */
  for (const item of marketingItems) {
    addSlugEntry(
      entries,
      "/marketing",
      item,
      DEFAULTS.detailPriority,
      DEFAULTS.blogFrequency
    );
  }

  /**
   * /creatives/[slug]
   */
  for (const item of creativeItems) {
    addSlugEntry(
      entries,
      "/creatives",
      item,
      DEFAULTS.detailPriority,
      DEFAULTS.blogFrequency
    );
  }

  /**
   * /job/[slug]
   */
  for (const item of jobItems) {
    addSlugEntry(
      entries,
      "/job",
      item,
      DEFAULTS.jobPriority,
      DEFAULTS.staticFrequency
    );
  }

  /**
   * /campaigns/[slug] — Phase 6 Studio public surface.
   */
  for (const item of campaignItems) {
    addSlugEntry(
      entries,
      "/campaigns",
      item,
      DEFAULTS.detailPriority,
      DEFAULTS.blogFrequency,
    );
  }

  /**
   * /social/[slug] — Phase 6 Studio public surface.
   */
  for (const item of socialItems) {
    addSlugEntry(
      entries,
      "/social",
      item,
      DEFAULTS.detailPriority,
      DEFAULTS.blogFrequency,
    );
  }

  /**
   * /ai/[slug] — Phase 6 Studio public surface.
   */
  for (const item of aiItems) {
    addSlugEntry(
      entries,
      "/ai",
      item,
      DEFAULTS.detailPriority,
      DEFAULTS.blogFrequency,
    );
  }

  /**
   * /solutions/[slug] — Phase 8b 2026-05-25, the API-driven.
   * Replaces the 10 hard-coded per-slug routes.
   */
  const solutionsItems: SlugItem[] = (solutionsResult.docs || []).map(
    adaptSlugItem,
  );
  for (const item of solutionsItems) {
    addSlugEntry(
      entries,
      "/solutions",
      item,
      DEFAULTS.servicePriority,
      DEFAULTS.staticFrequency,
    );
  }

  /**
   * Remove duplicate URLs.
   */
  const uniqueEntries = Array.from(
    new Map(entries.map((item) => [item.url, item])).values()
  );

  /**
   * Sort URLs alphabetically for cleaner sitemap output.
   */
  uniqueEntries.sort((a, b) => a.url.localeCompare(b.url));

  return uniqueEntries;
}