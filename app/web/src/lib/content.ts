// @ts-nocheck
/**
 * Server-side content fetchers.
 *
 * Pages + components import named helpers from this module
 * (getBrands, getBlogPosts, etc.) and use them directly in Server
 * Components. All data comes from the standalone Express + MongoDB
 * API (cocoma-admin-api) via src/lib/apiClient.ts.
 *
 * Each helper adapts the Mongo document shape into the legacy
 * document shape the page-level adapters already expect (e.g.
 * blog/page.tsx reads `slug`, `title`, `content`, `published_at`,
 * `author`, `category`, `tags`), so the UI is unchanged — only the
 * data origin differs. Caching uses Next.js native `revalidate`
 * (default 5 min) so SSR/ISR/SSG behaviour is preserved.
 */

import { apiGet } from "./apiClient";

/* During `next build` the external API may be unreachable; short-
   circuit list fetches to empty so sitemap / generateStaticParams
   get clean empty lists. Runtime SSR/ISR fetches real data. */
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

interface FindResult<T> {
  docs: T[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

interface FetchOpts {
  /** Override the default revalidate (in seconds). Pass 0 for no cache. */
  revalidate?: number;
  /** Where-query for the find. Shape: { field: { equals: value }, … } */
  where?: Record<string, unknown>;
  /** Depth for relationship population. Default 1. */
  depth?: number;
  /** Limit. Default 100. */
  limit?: number;
  /** Sort field. Pass with leading "-" for descending. */
  sort?: string;
}

/* ════════════════════════════════════════════════════════════════
   Migration seam: standalone Express + MongoDB content API.

   We are decoupling the web app from the in-process the CMS one
   content area at a time. Each collection listed in EXPRESS_SOURCES
   is served by the Express api (src/lib/apiClient.ts); every other
   collection still falls through to the legacy /content-api fetch
   below, so the site stays fully working mid-migration. When every
   collection is migrated, the API is removed.

   Each source adapts the Mongo document shape back into the
   the API-document shape that the page-level adapters already expect
   (e.g. blog/page.tsx's adaptPost reads `slug`, `title`, `content`,
   `published_at`, `author`, `category`, `tags`). That keeps the UI
   byte-for-byte identical — only the data origin changes.
   ════════════════════════════════════════════════════════════════ */

const emptyResult = <T>(): FindResult<T> => ({
  docs: [],
  totalDocs: 0,
  page: 1,
  totalPages: 0,
  hasNextPage: false,
});

/** Wrap an adapted doc array in the the API list envelope. */
const listResult = <T>(docs: T[], limit?: number): FindResult<T> => {
  const sliced = typeof limit === "number" ? docs.slice(0, limit) : docs;
  return {
    docs: sliced,
    totalDocs: docs.length,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
  };
};

interface ExpressSource {
  list?: (opts: FetchOpts) => Promise<FindResult<any>>;
  bySlug?: (slug: string, opts: FetchOpts) => Promise<any | null>;
}

/* ── Blog adapters (Mongo → the API-doc shape) ───────────────── */

interface MongoRef {
  _id?: string;
  category_name?: string;
  category_slug?: string;
  sub_category_name?: string;
  author_name?: string;
  author_image?: string;
  author_designation?: string;
}

interface MongoBlogPost {
  _id?: string;
  blog_slug?: string;
  blog_title?: string;
  blog_content?: string;
  blog_meta_title?: string;
  blog_meta_description?: string;
  blog_thumbnail?: string;
  blog_tags?: string[];
  read_time?: string;
  published_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
  blog_category_id?: MongoRef | string | null;
  author_template_id?: MongoRef | string | null;
}

interface MongoBlogCategory {
  _id?: string;
  category_name?: string;
  category_slug?: string;
  display_order?: number;
}

const adaptBlogPost = (m: MongoBlogPost) => {
  const cat = m.blog_category_id;
  const author = m.author_template_id;
  return {
    id: m._id,
    slug: m.blog_slug,
    title: m.blog_title,
    content: m.blog_content,
    excerpt: m.blog_meta_description,
    meta_title: m.blog_meta_title,
    reading_time: m.read_time,
    published_at: m.published_at ?? m.createdAt,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    /* imageUrl() falls back to legacyImageUrl when no Media doc is
       populated; the api already returns a full S3 URL here. */
    legacyImageUrl: m.blog_thumbnail ?? "",
    tags: Array.isArray(m.blog_tags) ? m.blog_tags : [],
    author:
      author && typeof author === "object"
        ? {
            id: author._id,
            author_name: author.author_name,
            author_image: author.author_image,
            author_designation: author.author_designation,
          }
        : (author ?? undefined),
    category:
      cat && typeof cat === "object"
        ? { id: cat._id, slug: cat.category_slug, name: cat.category_name }
        : undefined,
  };
};

const adaptBlogCategory = (m: MongoBlogCategory) => ({
  id: m._id,
  name: m.category_name,
  slug: m.category_slug,
});

/* ── Shared helpers ──────────────────────────────────────────── */

/** URL-safe slug fallback when a Mongo doc has no slug. */
const slugify = (input: string | null | undefined): string =>
  (input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ── Service taxonomy adapters (Mongo → the API-doc shape) ────── */

interface MongoServiceItem {
  _id?: string;
  service_title?: string;
  service_slug?: string;
  service_image?: string;
  service_video_url?: string;
  button_text?: string;
  button_url?: string | null;
  display_order?: number;
  service_category_id?: string;
}

interface MongoServiceCategory {
  _id?: string;
  service_category_name?: string;
  service_icon?: string;
  slug?: string | null;
  display_order?: number;
  items?: MongoServiceItem[];
}

const adaptServiceItem = (m: MongoServiceItem, categoryId?: string) => ({
  id: m._id,
  title: m.service_title,
  slug: m.service_slug,
  /* The header megamenu reads item.image directly (resolveImg);
     keep legacyImageUrl too for imageUrl() consumers elsewhere. */
  image: m.service_image ?? "",
  legacyImageUrl: m.service_image ?? "",
  video_url: m.service_video_url,
  button_text: m.button_text,
  button_url: m.button_url ?? undefined,
  order: m.display_order,
  category: { id: categoryId ?? m.service_category_id },
});

const adaptServiceCategory = (m: MongoServiceCategory) => ({
  id: m._id,
  category_name: m.service_category_name,
  slug: m.slug ?? slugify(m.service_category_name),
  order: m.display_order,
  /* Mongo has no featured flag. The header megamenu shows the main
     skill categories as tabs and appends "Our Other Services"
     separately, so every category except that one is "featured". */
  featuredOnHomepage: m.service_category_name !== "Our Other Services",
  homepageOrder: m.display_order ?? 999,
  legacyIconUrl: m.service_icon ?? "",
  items: Array.isArray(m.items)
    ? m.items.map((it) => adaptServiceItem(it, m._id))
    : [],
});

/* /common/categories returns categories WITH nested items; we serve
   both getServiceCategories and getServices (list) from it. */
const fetchServiceCategories = (revalidate?: number) =>
  apiGet<MongoServiceCategory[]>("/common/categories", { revalidate });

interface WhereClause {
  category?: { equals?: unknown; not_equals?: unknown };
}

/* ── Brand + Author adapters ─────────────────────────────────── */

interface MongoBrand {
  _id?: string;
  brand_name?: string;
  brand_image?: string;
  website_url?: string;
  slug?: string | null;
  display_order?: number;
}

const adaptBrand = (m: MongoBrand) => ({
  id: m._id,
  name: m.brand_name,
  slug: m.slug ?? slugify(m.brand_name),
  order: m.display_order,
  legacyImageUrl: m.brand_image ?? "",
  website_url: m.website_url,
});

interface MongoAuthor {
  _id?: string;
  author_name?: string;
  author_image?: string;
  author_description?: string;
  template_name?: string;
  founder_text?: string;
  founder_url?: string;
  cto_text?: string;
  cto_url?: string;
  author_url?: string;
  click_here_text?: string;
  click_here_url?: string;
  display_order?: number;
}

/* The legacy AuthorTemplate interface the blog detail page consumes
   uses the SAME field names the Mongo api returns (author_name,
   author_image, author_description, founder_text, cto_text …), so we
   pass them through and just normalise id + image fallback. */
const adaptAuthor = (m: MongoAuthor) => ({
  ...m,
  id: m._id,
  name: m.author_name,
  order: m.display_order,
  legacyImageUrl: m.author_image ?? "",
});

/* ── Jobs adapters ───────────────────────────────────────────── */

interface MongoJob {
  _id?: string;
  job_title?: string;
  job_slug?: string;
  job_experience?: string;
  job_type?: string;
  workplace_type?: string;
  job_location?: string;
  job_salary?: string | null;
  job_description?: string;
  job_requirements?: string;
  no_of_openings?: number;
  application_deadline?: string | null;
  display_order?: number;
  status?: number;
  job_category_id?: { _id?: string; name?: string; slug?: string } | string | null;
}

const adaptJob = (m: MongoJob) => {
  const cat = m.job_category_id;
  return {
    ...m,
    id: m._id,
    slug: m.job_slug,
    title: m.job_title,
    experience: m.job_experience,
    work_type: m.workplace_type,
    location: m.job_location,
    salary_range: m.job_salary ?? undefined,
    description: m.job_description,
    requirements: m.job_requirements,
    order: m.display_order,
    is_active: m.status === 1,
    department:
      cat && typeof cat === "object"
        ? { id: cat._id, name: cat.name, slug: cat.slug }
        : cat
          ? { id: cat }
          : undefined,
  };
};

interface MongoJobCategory {
  _id?: string;
  name?: string;
  slug?: string;
  display_order?: number;
}

const adaptJobCategory = (m: MongoJobCategory) => ({
  ...m,
  id: m._id,
  name: m.name,
  slug: m.slug,
  order: m.display_order,
});

/* ── Marketing category adapter ──────────────────────────────── */

interface MongoMarketingCategory {
  _id?: string;
  category_name?: string;
}

const adaptMarketingCategory = (m: MongoMarketingCategory) => ({
  id: m._id,
  name: m.category_name,
  slug: slugify(m.category_name),
});

/* ── Image URL builder ───────────────────────────────────────── */

/* Some api endpoints return full S3 URLs, others return raw object
   keys. Normalise both to an absolute URL. */
const S3_BASE = "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/";
const buildImg = (v?: string | null): string =>
  !v ? "" : /^https?:\/\//.test(v) ? v : S3_BASE + v.replace(/^\/+/, "");

/* ── Creative-house adapters ─────────────────────────────────── */

interface MongoCreativeItem {
  _id?: string;
  creative_house_slug?: string;
  creative_house_video_title?: string;
  creative_house_video_url?: string;
  creative_house_thumbnail?: string;
  display_order?: number;
  creative_house_category_id?: string;
}

interface MongoCreativeCategory {
  _id?: string;
  creative_house_category_name?: string;
  creative_house_category_slug?: string;
  creative_house_icon?: string;
  display_order?: number;
  items?: MongoCreativeItem[];
}

const adaptCreativeItem = (
  it: MongoCreativeItem,
  cat?: MongoCreativeCategory,
) => ({
  ...it,
  id: it._id,
  slug: it.creative_house_slug,
  title: it.creative_house_video_title,
  video_url: it.creative_house_video_url,
  order: it.display_order,
  legacyImageUrl: buildImg(it.creative_house_thumbnail),
  category: cat
    ? {
        id: cat._id,
        category_name: cat.creative_house_category_name,
        slug: cat.creative_house_category_slug,
      }
    : { id: it.creative_house_category_id },
});

/* ── Marketing-house adapters ────────────────────────────────── */

interface MongoMarketingItem {
  _id?: string;
  marketing_house_slug?: string;
  title?: string;
  poster_image?: string;
  marketing_house_thumbnail?: string;
  display_order?: number;
  marketing_house_category_id?: string;
}

interface MongoMarketingHouseCategory {
  _id?: string;
  category_name?: string;
  marketing_house_icon?: string;
  display_order?: number;
  items?: MongoMarketingItem[];
}

const adaptMarketingItem = (
  it: MongoMarketingItem,
  cat?: MongoMarketingHouseCategory,
) => ({
  ...it,
  id: it._id,
  slug: it.marketing_house_slug,
  title: it.title,
  order: it.display_order,
  legacyImageUrl: buildImg(it.poster_image || it.marketing_house_thumbnail),
  category: cat
    ? { id: cat._id, name: cat.category_name }
    : { id: it.marketing_house_category_id },
});

const byOrder = <T extends { order?: number }>(a: T, b: T): number =>
  (a.order ?? 0) - (b.order ?? 0);

/* ── Site-content adapters ───────────────────────────────────── */

interface MongoSuccessStory {
  _id?: string;
  slug?: string | null;
  project_title?: string;
  stats_title?: string;
  project_description?: string;
  project_image?: string;
  client_name?: string;
  display_order?: number;
}

const adaptSuccessStory = (m: MongoSuccessStory) => ({
  ...m,
  id: m._id,
  slug: m.slug ?? slugify(m.project_title ?? m.stats_title),
  title: m.project_title ?? m.stats_title,
  client_name: m.client_name,
  order: m.display_order,
  legacyImageUrl: buildImg(m.project_image),
});

interface MongoMonthlyPerf {
  _id?: string;
  mps_icon?: string;
  mps_category_name?: string;
  display_order?: number;
  mps_subcategory?: unknown[];
}

const adaptMonthlyPerf = (m: MongoMonthlyPerf) => ({
  ...m,
  id: m._id,
  title: m.mps_category_name,
  order: m.display_order,
  legacyIconUrl: buildImg(m.mps_icon),
  subcategories: m.mps_subcategory ?? [],
});

interface MongoOurAdvantage {
  _id?: string;
  display_order?: number;
  advantage_icon?: string;
  image?: string;
}

const adaptOurAdvantage = (m: MongoOurAdvantage) => ({
  ...m,
  id: m._id,
  order: m.display_order,
  legacyImageUrl: buildImg(m.image || m.advantage_icon),
});

interface MongoBookCall {
  _id?: string;
  book_name?: string;
  book_image?: string;
  book_heading?: string;
  book_title1?: string;
  book_title2?: string;
  book_description1?: string;
  book_description2?: string;
  book_button_text?: string;
  book_button_url?: string;
  display_order?: number;
}

const adaptBookCall = (m: MongoBookCall) => ({
  ...m,
  id: m._id,
  book_heading: m.book_heading,
  book_button_text: m.book_button_text,
  legacyImageUrl: buildImg(m.book_image),
  left_column: { book_title1: m.book_title1, book_description1: m.book_description1 },
  right_column: { book_title2: m.book_title2, book_description2: m.book_description2 },
  order: m.display_order,
});

interface MongoHomeSectionItem {
  _id?: string;
  name?: string;
  image?: string;
  item_image?: string;
  url?: string;
  display_order?: number;
}

interface MongoHomeSection {
  _id?: string;
  category_name?: string;
  display_order?: number;
  items?: MongoHomeSectionItem[];
}

/* Home YouTube rails: /home-page-sections returns sections → items;
   the homepage aggregator expects a FLAT list of cards each carrying
   its section name in `subtitle` (+ title/link/image). */
const adaptHomeYoutubeCard = (
  it: MongoHomeSectionItem,
  sec: MongoHomeSection,
) => ({
  id: it._id,
  title: it.name,
  subtitle: sec.category_name,
  link: it.url,
  legacyImageUrl: buildImg(it.image || it.item_image),
  order: it.display_order,
});

const EXPRESS_SOURCES: Record<string, ExpressSource> = {
  "home-youtube-cards": {
    list: async (opts) => {
      const sections = await apiGet<MongoHomeSection[]>(
        "/home-page-sections",
        { revalidate: opts.revalidate },
      );
      const cards = (sections ?? []).flatMap((sec) =>
        Array.isArray(sec.items)
          ? sec.items.map((it) => adaptHomeYoutubeCard(it, sec))
          : [],
      );
      return listResult(cards, opts.limit);
    },
  },
  "success-stories": {
    list: async (opts) => {
      const data = await apiGet<MongoSuccessStory[]>(
        "/common/success-stories",
        { revalidate: opts.revalidate },
      );
      return listResult((data ?? []).map(adaptSuccessStory), opts.limit);
    },
  },
  "monthly-performance": {
    list: async (opts) => {
      const data = await apiGet<{ monthly_performance?: MongoMonthlyPerf[] }>(
        "/home/monthly-performance-showcase",
        { revalidate: opts.revalidate },
      );
      return listResult(
        (data?.monthly_performance ?? []).map(adaptMonthlyPerf),
        opts.limit,
      );
    },
  },
  "our-advantages": {
    list: async (opts) => {
      const data = await apiGet<MongoOurAdvantage[]>("/common/our-advantage", {
        revalidate: opts.revalidate,
      });
      return listResult((data ?? []).map(adaptOurAdvantage), opts.limit);
    },
  },
  "book-call-templates": {
    list: async (opts) => {
      const data = await apiGet<MongoBookCall[]>("/common/book-call", {
        revalidate: opts.revalidate,
      });
      return listResult((data ?? []).map(adaptBookCall), opts.limit);
    },
  },
  "creative-house-items": {
    list: async (opts) => {
      const cats = await apiGet<MongoCreativeCategory[]>("/creative", {
        revalidate: opts.revalidate,
      });
      let items = (cats ?? []).flatMap((c) =>
        Array.isArray(c.items)
          ? c.items.map((it) => adaptCreativeItem(it, c))
          : [],
      );
      const where = opts.where as WhereClause | undefined;
      if (where?.category?.equals !== undefined) {
        items = items.filter((s) => s.category.id === where.category!.equals);
      }
      items.sort(byOrder);
      return listResult(items, opts.limit);
    },
  },
  "marketing-house-items": {
    list: async (opts) => {
      const cats = await apiGet<MongoMarketingHouseCategory[]>("/marketing", {
        revalidate: opts.revalidate,
      });
      let items = (cats ?? []).flatMap((c) =>
        Array.isArray(c.items)
          ? c.items.map((it) => adaptMarketingItem(it, c))
          : [],
      );
      const where = opts.where as WhereClause | undefined;
      if (where?.category?.equals !== undefined) {
        items = items.filter((s) => s.category.id === where.category!.equals);
      }
      items.sort(byOrder);
      return listResult(items, opts.limit);
    },
  },
  jobs: {
    list: async (opts) => {
      const data = await apiGet<MongoJob[]>("/job/list", {
        revalidate: opts.revalidate,
      });
      return listResult((data ?? []).map(adaptJob), opts.limit);
    },
    bySlug: async (slug) => {
      const data = await apiGet<MongoJob>(
        `/job/detail/${encodeURIComponent(slug)}`,
      );
      return data ? adaptJob(data) : null;
    },
  },
  "job-categories": {
    list: async (opts) => {
      const data = await apiGet<MongoJobCategory[]>("/job-categories", {
        revalidate: opts.revalidate,
      });
      return listResult((data ?? []).map(adaptJobCategory), opts.limit);
    },
  },
  "marketing-categories": {
    list: async (opts) => {
      const data = await apiGet<{ categories?: MongoMarketingCategory[] }>(
        "/marketing/filter-data",
        { revalidate: opts.revalidate },
      );
      return listResult(
        (data?.categories ?? []).map(adaptMarketingCategory),
        opts.limit,
      );
    },
  },
  "service-categories": {
    list: async (opts) => {
      const cats = await fetchServiceCategories(opts.revalidate);
      return listResult((cats ?? []).map(adaptServiceCategory), opts.limit);
    },
  },
  services: {
    /* List only. Detail (getService(slug)) still resolves via the API
       until the group-service detail endpoint is wired. */
    list: async (opts) => {
      const cats = await fetchServiceCategories(opts.revalidate);
      let items = (cats ?? []).flatMap((c) =>
        Array.isArray(c.items)
          ? c.items.map((it) => adaptServiceItem(it, c._id))
          : [],
      );
      const where = opts.where as WhereClause | undefined;
      if (where?.category?.equals !== undefined) {
        items = items.filter((s) => s.category.id === where.category!.equals);
      }
      if (where?.category?.not_equals !== undefined) {
        items = items.filter(
          (s) => s.category.id !== where.category!.not_equals,
        );
      }
      return listResult(items, opts.limit);
    },
  },
  brands: {
    list: async (opts) => {
      const data = await apiGet<MongoBrand[]>("/common/brands", {
        revalidate: opts.revalidate,
      });
      return listResult((data ?? []).map(adaptBrand), opts.limit);
    },
  },
  authors: {
    list: async (opts) => {
      const data = await apiGet<MongoAuthor[]>("/common/author", {
        revalidate: opts.revalidate,
      });
      return listResult((data ?? []).map(adaptAuthor), opts.limit);
    },
  },
  "blog-posts": {
    list: async (opts) => {
      const data = await apiGet<MongoBlogPost[]>("/blog/items", {
        revalidate: opts.revalidate,
      });
      return listResult((data ?? []).map(adaptBlogPost), opts.limit);
    },
    bySlug: async (slug) => {
      const data = await apiGet<{ blog: MongoBlogPost }>(
        `/blog/detail/${encodeURIComponent(slug)}`,
      );
      return data?.blog ? adaptBlogPost(data.blog) : null;
    },
  },
  "blog-categories": {
    list: async (opts) => {
      const data = await apiGet<MongoBlogCategory[]>("/blog/categories", {
        revalidate: opts.revalidate,
      });
      return listResult((data ?? []).map(adaptBlogCategory), opts.limit);
    },
  },
};

/**
 * Low-level: fetch a list from a collection. Returns the full
 * `{ docs, totalDocs, page, totalPages, hasNextPage }` shape.
 *
 * Routes through the standalone Express api for migrated collections
 * (see EXPRESS_SOURCES); otherwise falls back to the legacy
 * in-process /content-api fetch.
 *
 * Most callers should use the higher-level helpers below
 * (getBrands, getBlogPosts, …) which wrap this with sensible
 * defaults per collection.
 */
export const findCollection = async <T = unknown>(
  collection: string,
  opts: FetchOpts = {},
): Promise<FindResult<T>> => {
  if (IS_BUILD) {
    return emptyResult<T>();
  }
  const source = EXPRESS_SOURCES[collection];
  if (source?.list) {
    return source.list(opts) as Promise<FindResult<T>>;
  }
  /* the API removed: collections not yet wired to the Express api
     return an empty list. Pages render their empty/mock states; the
     remaining collections are migrated incrementally above. */
  return emptyResult<T>();
};

/**
 * Low-level: fetch a single doc by slug. Returns the doc or null
 * if not found. Pages can use `notFound()` from next/navigation to
 * render a 404 when this returns null.
 */
export const findBySlug = async <T = unknown>(
  collection: string,
  slug: string,
  opts: Omit<FetchOpts, "where" | "limit"> = {},
): Promise<T | null> => {
  const source = EXPRESS_SOURCES[collection];
  if (source?.bySlug) {
    return source.bySlug(slug, opts) as Promise<T | null>;
  }
  const res = await findCollection<T>(collection, {
    ...opts,
    where: { slug: { equals: slug } },
    limit: 1,
  });
  return res.docs[0] ?? null;
};

/**
 * Low-level: fetch a global doc. Globals are singletons; no list
 * shape. Returns the global directly.
 */
export const getGlobal = async <T = unknown>(
  _slug: string,
  _opts: { revalidate?: number; depth?: number } = {},
): Promise<T | null> => {
  /* the API removed: globals (site-settings, homepage-content,
     about-page, hire-us-content) have no MongoDB equivalent yet.
     Consumers fall back to their mock/default content. */
  return null;
};

/* ── Per-collection convenience helpers ──────────────────────── */

export const getBrands = (opts?: FetchOpts) =>
  findCollection<any>("brands", { sort: "order", ...opts });

export const getBlogPosts = (opts?: FetchOpts) =>
  findCollection<any>("blog-posts", { sort: "-published_at", ...opts });

export const getBlogPost = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("blog-posts", slug, opts);

export const getBlogCategories = (opts?: FetchOpts) =>
  findCollection<any>("blog-categories", { sort: "name", ...opts });

export const getServices = (opts?: FetchOpts) =>
  findCollection<any>("services", { sort: "order", ...opts });

export const getService = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("services", slug, { depth: 2, ...opts });

export const getServiceCategories = (opts?: FetchOpts) =>
  findCollection<any>("service-categories", { sort: "order", ...opts });

export const getCreativeHouseItems = (opts?: FetchOpts) =>
  findCollection<any>("creative-house-items", { sort: "order", ...opts });

export const getCreativeHouseItem = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("creative-house-items", slug, opts);

export const getMarketingHouseItems = (opts?: FetchOpts) =>
  findCollection<any>("marketing-house-items", { sort: "order", ...opts });

export const getMarketingHouseItem = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("marketing-house-items", slug, opts);

export const getMarketingCategories = (opts?: FetchOpts) =>
  findCollection<any>("marketing-categories", { sort: "name", ...opts });

export const getSuccessStories = (opts?: FetchOpts) =>
  findCollection<any>("success-stories", { sort: "order", ...opts });

export const getSuccessStory = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("success-stories", slug, opts);

/* Phase 6 Studio collections 2026-05-24. Public surfaces at
   /campaigns, /social, /ai render content authored in Studio. */
export const getCampaigns = (opts?: FetchOpts) =>
  findCollection<any>("campaigns", { sort: "-start_date", ...opts });

export const getCampaign = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("campaigns", slug, opts);

export const getSocialPosts = (opts?: FetchOpts) =>
  findCollection<any>("social-posts", { sort: "-scheduled_at", ...opts });

export const getSocialPost = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("social-posts", slug, opts);

export const getAIShowcases = (opts?: FetchOpts) =>
  findCollection<any>("ai-showcases", { sort: "-updatedAt", ...opts });

export const getAIShowcase = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("ai-showcases", slug, opts);

export const getDepartments = (opts?: FetchOpts) =>
  findCollection<any>("departments", { sort: "order", ...opts });

export const getDepartmentBySlug = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("departments", slug, opts);

/* Phase 8a 2026-05-25: SolutionsPages now the single source of
   truth for /solutions/<slug>. */
export const getSolutionsPages = (opts?: FetchOpts) =>
  findCollection<any>("solutions-pages", {
    sort: "order",
    where: { is_active: { equals: true } },
    ...opts,
  });

export const getSolutionsPage = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("solutions-pages", slug, opts);

export const getBanners = (placement?: string, opts?: FetchOpts) =>
  findCollection<any>("banners", {
    sort: "order",
    where: placement ? { placement: { equals: placement } } : undefined,
    ...opts,
  });

export const getMonthlyPerformance = (opts?: FetchOpts) =>
  findCollection<any>("monthly-performance", { sort: "-order", ...opts });

export const getHomeYoutubeCards = (opts?: FetchOpts) =>
  findCollection<any>("home-youtube-cards", { sort: "order", ...opts });

export const getJobs = (opts?: FetchOpts) =>
  findCollection<any>("jobs", {
    sort: "-createdAt",
    where: { is_active: { equals: true } },
    ...opts,
  });

export const getJob = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("jobs", slug, opts);

export const getJobCategories = (opts?: FetchOpts) =>
  findCollection<any>("job-categories", { sort: "name", ...opts });

export const getAuthors = (opts?: FetchOpts) =>
  findCollection<any>("authors", { sort: "name", ...opts });

/* ── Previously-missing helpers added 2026-06-01 ────────────── */

/** ServiceItems — individual service offering pages at /service/<slug>. */
export const getServiceItems = (opts?: FetchOpts) =>
  findCollection<any>("service-items", { sort: "order", ...opts });

export const getServiceItem = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("service-items", slug, { depth: 2, ...opts });

/** WorkPages — editable copy for /work/<slug> pages. */
export const getWorkPages = (opts?: FetchOpts) =>
  findCollection<any>("work-pages", {
    sort: "order",
    where: { is_active: { equals: true } },
    ...opts,
  });

export const getWorkPage = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("work-pages", slug, opts);

/** OurAdvantages — "Why Cocoma" cards by placement. */
export const getOurAdvantages = (placement?: string, opts?: FetchOpts) =>
  findCollection<any>("our-advantages", {
    sort: "order",
    where: placement ? { placement: { equals: placement } } : undefined,
    ...opts,
  });

/** ContentCreatedItems — tiles inside /work/content-created. */
export const getContentCreatedItems = (opts?: FetchOpts) =>
  findCollection<any>("content-created-items", { sort: "order", ...opts });

/** ContentCreatedCarousels — child carousel sets for content-created. */
export const getContentCreatedCarousels = (opts?: FetchOpts) =>
  findCollection<any>("content-created-carousels", { sort: "order", ...opts });

/** ContinuityProgramItems — carousel items inside marketing-house details. */
export const getContinuityProgramItems = (opts?: FetchOpts) =>
  findCollection<any>("continuity-program-items", { sort: "order", ...opts });

/** OtherActivities — add-on activity tiles inside marketing-house items. */
export const getOtherActivities = (opts?: FetchOpts) =>
  findCollection<any>("other-activities", { sort: "order", ...opts });

/** DepartmentMemberships — user ↔ department join (Studio scoping). */
export const getDepartmentMemberships = (opts?: FetchOpts) =>
  findCollection<any>("department-memberships", { sort: "createdAt", ...opts });

/** About page global — editorial copy for /about-us. */
export const getAboutPage = (opts?: { revalidate?: number; depth?: number }) =>
  getGlobal<any>("about-page", opts);

/** Site settings global — the footer / header read from this. */
export const getSiteSettings = (opts?: { revalidate?: number; depth?: number }) =>
  getGlobal<any>("site-settings", opts);

/** Homepage content global — hero copy + section toggles. */
export const getHomepageContent = (opts?: { revalidate?: number; depth?: number }) =>
  getGlobal<any>("homepage-content", opts);

/** Homepage "Latest Success Stories" rail — rich client case-study
    data from the API's /home/client endpoint (client_title / client_img
    / client_slug / client_description). */
export const getHomeClients = async (opts?: { revalidate?: number }) => {
  const data = await apiGet<{ client?: any[] }>("/home/client", {
    revalidate: opts?.revalidate,
  });
  return (data?.client ?? []).map((c: any) => ({
    id: c._id,
    slug: c.client_slug,
    client_img: buildImg(c.client_img),
    client_title: c.client_title,
    client_description: c.client_description,
  }));
};

/** Hire-us content — homepage "what do you need?" cards. Sourced from
    the API's UserChoice list, shaped as the legacy global the homepage
    aggregator reads (user_choices.items[]). */
export const getHireUsContent = async (opts?: { revalidate?: number; depth?: number }) => {
  const data = await apiGet<any[]>("/common/hire-us", {
    revalidate: opts?.revalidate,
  });
  return { user_choices: { items: data ?? [] } };
};

/** Book-a-call template by numeric id — homepage closing card + ScheduleMeeting form. */
export const getBookCallTemplate = async (
  id: number | string,
  opts?: FetchOpts,
): Promise<any | null> => {
  const res = await findCollection<any>("book-call-templates", {
    where: { id: { equals: id } },
    limit: 1,
    depth: opts?.depth ?? 1,
    ...(opts ?? {}),
  });
  return res.docs?.[0] ?? null;
};

/* ── Image URL helpers ─────────────────────────────────────── */

/**
 * Given a doc, return whichever image URL is available:
 * 1. The actual Media doc's url (when image-linkage cleanup ships)
 * 2. Fall back to legacyImageUrl (text field with the raw S3 URL)
 * 3. Empty string if neither
 *
 * Components use this to render a hero image without caring about
 * Phase 6 cleanup status.
 */
export const imageUrl = (
  doc: any,
  field: string = "image",
): string => {
  const direct = doc?.[field];
  /* If the field is populated as a Media doc (depth>0 query) it'll
     have `url`. */
  if (direct && typeof direct === "object" && direct.url) return direct.url;
  /* Otherwise look for the legacy fallback. */
  const legacyField =
    field === "thumbnail"
      ? "legacyThumbnailUrl"
      : "legacyImageUrl";
  return doc?.[legacyField] ?? "";
};
