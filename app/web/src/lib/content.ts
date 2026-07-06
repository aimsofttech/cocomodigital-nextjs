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
  /** 1-based page for paginated lists. */
  page?: number;
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

/** Paginate an adapted doc array (1-based page) with real totals. */
const pagedResult = <T>(
  docs: T[],
  limit?: number,
  page?: number,
): FindResult<T> => {
  const lim = typeof limit === "number" && limit > 0 ? limit : docs.length || 1;
  const pg = typeof page === "number" && page > 0 ? page : 1;
  const start = (pg - 1) * lim;
  return {
    docs: docs.slice(start, start + lim),
    totalDocs: docs.length,
    page: pg,
    totalPages: Math.max(1, Math.ceil(docs.length / lim)),
    hasNextPage: start + lim < docs.length,
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
  /* The api stores the name as `blog_category_name`; older imports
     used `category_name`. Slug is often empty so it's derived. */
  blog_category_name?: string;
  category_name?: string;
  slug?: string | null;
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
    /* Cover image. The api leaves `blog_thumbnail` empty and stores
       the real cover under `main_image` (a bare S3 key), so fall back
       to it and absolutize. `image` is set too so the client-side
       filter path (which reads the adapted doc directly) renders the
       cover, not just the SSR path that goes through imageUrl(). */
    legacyImageUrl: buildImg(m.blog_thumbnail || (m as any).main_image),
    image: buildImg(m.blog_thumbnail || (m as any).main_image),
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
        ? {
            id: cat._id,
            name: (cat as any).blog_category_name ?? cat.category_name,
            slug:
              (cat as any).slug ||
              cat.category_slug ||
              slugify((cat as any).blog_category_name ?? cat.category_name),
          }
        : undefined,
  };
};

const adaptBlogCategory = (m: MongoBlogCategory) => {
  const name = m.blog_category_name ?? m.category_name ?? "";
  return {
    id: m._id,
    name,
    /* the api leaves the slug blank, so derive it from the name. */
    slug: m.slug || m.category_slug || slugify(name),
  };
};

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
  title?: string;
  slug?: string;
  image?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonUrl?: string | null;
  displayOrder?: number;
  serviceCategoryId?: string;
}

interface MongoServiceCategory {
  _id?: string;
  name?: string;
  icon?: string;
  slug?: string | null;
  displayOrder?: number;
  items?: MongoServiceItem[];
}

const adaptServiceItem = (m: MongoServiceItem, categoryId?: string) => ({
  id: m._id,
  title: m.title,
  slug: m.slug,
  /* The header megamenu reads item.image directly (resolveImg);
     keep legacyImageUrl too for imageUrl() consumers elsewhere. */
  image: m.image ?? "",
  legacyImageUrl: m.image ?? "",
  video_url: m.videoUrl,
  button_text: m.buttonText,
  button_url: m.buttonUrl ?? undefined,
  order: m.displayOrder,
  category: { id: categoryId ?? m.serviceCategoryId },
});

const adaptServiceCategory = (m: MongoServiceCategory) => ({
  id: m._id,
  category_name: m.name,
  slug: m.slug ?? slugify(m.name),
  order: m.displayOrder,
  /* Mongo has no featured flag. The header megamenu shows the main
     skill categories as tabs and appends "Our Other Services"
     separately, so every category except that one is "featured". */
  featuredOnHomepage: m.name !== "Our Other Services",
  homepageOrder: m.displayOrder ?? 999,
  legacyIconUrl: m.icon ?? "",
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
  "category.slug"?: { equals?: unknown };
  title?: { contains?: unknown; like?: unknown };
}

/* ── Brand + Author adapters ─────────────────────────────────── */

interface MongoBrand {
  _id?: string;
  name?: string;
  image?: string;
  websiteUrl?: string;
  slug?: string | null;
  displayOrder?: number;
}

const adaptBrand = (m: MongoBrand) => ({
  id: m._id,
  name: m.name,
  slug: m.slug ?? slugify(m.name),
  order: m.displayOrder,
  legacyImageUrl: m.image ?? "",
  website_url: m.websiteUrl,
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
  experience?: string[];
  job_type?: string | string[];
  workplace_type?: string | string[];
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

/* Multi-select fields (job_type / workplace_type) have been saved in
   three different shapes across the data's history: a real array
   (current schema), a single scalar string (legacy single-select),
   or a comma-joined string (legacy multi-select, e.g.
   "full_time,freelance,internship"). Normalise all three into a
   plain string array so downstream humanising/label-mapping always
   operates on individual values instead of mangling a joined blob. */
const splitMulti = (v?: string | string[] | null): string[] => {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return arr.flatMap((s) =>
    typeof s === "string" ? s.split(",").map((x) => x.trim()) : s,
  ).filter(Boolean);
};

/* Experience has the same multi-shape problem as job_type, plus the
   legacy single-select values are raw codes ("1-2", "5", "0") rather
   than display labels. Humanise each code into a readable label;
   values that already look like a label (contain "year") pass
   through untouched. */
const humaniseExperienceCode = (v: string): string | null => {
  if (!v) return null;
  if (/year/i.test(v)) return v;
  if (v === "0") return "Fresher";
  const range = v.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) return `${range[1]} - ${range[2]} Years`;
  if (/^\d+\+?$/.test(v)) return `${v} Years`;
  return v;
};

/* The new schema's `experience` array takes priority when populated;
   otherwise fall back to the legacy scalar `job_experience` field —
   most existing job postings only ever had the legacy field set. */
const normaliseExperience = (m: MongoJob): string[] => {
  const source =
    Array.isArray(m.experience) && m.experience.length
      ? m.experience
      : m.job_experience
        ? [m.job_experience]
        : [];
  return source.map(humaniseExperienceCode).filter(Boolean) as string[];
};

const adaptJob = (m: MongoJob) => {
  const cat = m.job_category_id;
  return {
    ...m,
    id: m._id,
    slug: m.job_slug,
    title: m.job_title,
    experience: normaliseExperience(m),
    job_type: splitMulti(m.job_type),
    work_type: splitMulti(m.workplace_type),
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
  name?: string;
}

const adaptMarketingCategory = (m: MongoMarketingCategory) => ({
  id: m._id,
  name: m.name,
  slug: slugify(m.name),
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
  slug?: string;
  videoTitle?: string;
  videoUrl?: string;
  uploadVideoUrl?: string;
  youtubeId?: string;
  thumbnail?: string;
  displayOrder?: number;
  creativeHouseCategoryId?: string;
}

interface MongoCreativeCategory {
  _id?: string;
  name?: string;
  slug?: string;
  icon?: string;
  displayOrder?: number;
  items?: MongoCreativeItem[];
}

const adaptCreativeItem = (
  it: MongoCreativeItem,
  cat?: MongoCreativeCategory,
) => ({
  ...it,
  id: it._id,
  slug: it.slug,
  title: it.videoTitle,
  video_url: it.videoUrl,
  // Uploaded video (raw S3 key from the api) → absolute URL; plus the YouTube
  // id. Carried so card grids can show a play indicator for every item that
  // has a video, regardless of which field holds it.
  upload_video: buildImg(it.uploadVideoUrl),
  youtube_id: it.youtubeId,
  order: it.displayOrder,
  legacyImageUrl: buildImg(it.thumbnail),
  category: cat
    ? {
        id: cat._id,
        category_name: cat.name,
        slug: cat.slug,
      }
    : { id: it.creativeHouseCategoryId },
});

/* Detail adapter for the SingleVideo page. The api's
   /creative/single/<slug> endpoint returns the full item plus its
   `approaches` and `final_outputs` sub-collections; the legacy list
   adapter (adaptCreativeItem) only carries the thumbnail-card fields,
   so the detail page's sections (HowWeEdit player, BriefAndRequirement,
   CreativeApproach slider, FinalOutput media) came up empty. This maps
   the raw Mongo field names back into the flat shape those components
   already read (title / thumbnail / upload_video / heading / …). */
const adaptCreativeDetail = (d: any) => {
  const item = d?.item ?? {};
  const approaches = Array.isArray(d?.approaches) ? d.approaches : [];
  const finalOutputs = Array.isArray(d?.final_outputs) ? d.final_outputs : [];
  return {
    ...item,
    id: item._id,
    slug: item.slug,
    title: item.videoTitle ?? item.title,
    /* HowWeEdit hero player. thumbnail is already an absolute S3 URL
       from the controller; upload_video is a raw object key. buildImg
       passes absolute URLs through and prefixes bare keys. */
    thumbnail: buildImg(item.thumbnail),
    upload_video: buildImg(item.uploadVideoUrl),
    video_url: item.videoUrl,
    /* BriefAndRequirement brand logo. The api resolves the legacy
       `requirementTitle` int FK against the gallery table and returns
       the absolute logo URL as `requirement_logo`; empty string when
       the item has no brief logo (the section then hides the image). */
    requirement_logo: buildImg(item.requirement_logo),
    requirementDescription: item.requirementDescription,
    /* BookCallBanner reads a numeric template id; the legacy fk is the
       stable public id. author_id is preserved for back-compat. */
    book_call_id:
      item._legacy_fks?.book_call_template_id ?? item.bookCallTemplateId,
    author_id: item.authorTemplateId,
    /* CreativeApproach slider items. */
    creative_house_approach: approaches.map((a: any) => ({
      id: a._id,
      creativeHouseItemId: a.creativeHouseItemId,
      heading: a.heading ?? a.title,
      description: a.description,
      thumbnail: buildImg(a.thumbnail || a.image),
      upload_video: buildImg(a.uploadVideoUrl),
      video_url: a.videoUrl,
    })),
    /* FinalOutput (Project Media) slider items. */
    creative_house_final_output: finalOutputs.map((f: any) => ({
      id: f._id,
      title: f.title,
      thumbnail: buildImg(f.thumbnail || f.image),
      upload_video: buildImg(f.uploadVideoUrl),
      video_url: f.videoUrl,
    })),
    /* No services sub-collection on the api yet; the curated
       SERVICE_FORMATS grid in CreativeHouseServices is the static
       fallback, so an empty list just hides the dynamic cards. */
    services: Array.isArray(item.services) ? item.services : [],
  };
};

/* ── Marketing-house adapters ────────────────────────────────── */

interface MongoMarketingItem {
  _id?: string;
  slug?: string;
  title?: string;
  posterImage?: string;
  thumbnail?: string;
  displayOrder?: number;
  marketingHouseCategoryId?: string;
}

interface MongoMarketingHouseCategory {
  _id?: string;
  name?: string;
  icon?: string;
  displayOrder?: number;
  items?: MongoMarketingItem[];
}

const adaptMarketingItem = (
  it: MongoMarketingItem,
  cat?: MongoMarketingHouseCategory,
) => ({
  ...it,
  id: it._id,
  slug: it.slug,
  title: it.title,
  order: it.displayOrder,
  /* Legacy key kept for the grid pages/components that read it. */
  poster_image: it.posterImage,
  legacyImageUrl: buildImg(it.posterImage || it.thumbnail),
  category: cat
    ? { id: cat._id, name: cat.name }
    : { id: it.marketingHouseCategoryId },
});

/* ── Marketing-house DETAIL (single case-study page) ─────────────
   The /marketing/<slug> page (WebSeriesIndividual) needs the full
   item PLUS its many sub-collections (stats, strategy, performance,
   add-on activities, content-created, continuity program, slider
   images). The list endpoint only carries the bare item, so every
   one of those sections came up empty. The api's /marketing/single/
   <slug> endpoint aggregates them all; this maps that response into
   the flat legacy `itemData` shape the page's components read. */
const arr = <T>(v: any): T[] => (Array.isArray(v) ? v : []);

const fetchMarketingDetail = (slug: string, revalidate?: number) =>
  apiGet<any>(`/marketing/single/${encodeURIComponent(slug)}`, { revalidate });

const adaptMarketingDetail = (d: any) => {
  const item = d?.item ?? {};
  const catId =
    typeof item.marketingHouseCategoryId === "object"
      ? item.marketingHouseCategoryId?._id
      : item.marketingHouseCategoryId;
  return {
    ...item,
    id: item._id,
    slug: item.slug,
    title: item.title,
    poster_image: buildImg(item.posterImage),
    video: item.video,
    legacyImageUrl: buildImg(item.posterImage || item.thumbnail),
    /* Legacy flat keys the page components still read — mapped from
       the API's camelCase document keys. */
    marketing_video: item.video,
    marketing_video_type: item.videoType,
    release_date: item.releaseDate,
    performance_description: item.performanceDescription,
    client_requirement_text: item.clientRequirementText,
    client_requirement_desc: item.clientRequirementDesc,
    client_requirement_1: item.clientRequirement1,
    client_requirement_2: item.clientRequirement2,
    client_requirement_3: item.clientRequirement3,
    client_requirement_4: item.clientRequirement4,
    client_requirement_5: item.clientRequirement5,
    client_requirement_6: item.clientRequirement6,
    /* SingleWebSeriesData stats band reads highlights_* + highlights[] */
    highlights_title: item.statsTitle,
    highlights_description: item.statsDescription,
    highlights: arr<any>(d.statics).map((s) => ({
      value: s.value,
      name: s.name,
    })),
    /* category relationship — WebSeriesIndividual derives category_id
       from `category` for the RelatedCaseStudies rail. */
    category: { id: catId },
    /* Slider images (SingleWebSeriesData) */
    images: arr<any>(d.images).map((i) => ({
      image: buildImg(i.image),
      upload_video: buildImg(i.uploadVideoUrl),
      video_url: i.videoUrl || "",
      marketing_video: i.video,
    })),
    /* StrategyExecution "Our Activities" rows (pre-launch rows were merged
       into idea_strategy; d.pre_launch kept as a legacy fallback). */
    ideas_strategy_planning: [...arr<any>(d.idea_strategy), ...arr<any>(d.pre_launch)].map((i) => ({
      id: i._id,
      marketingHouseItemId: i.marketingHouseItemId,
      title: i.title,
      description: i.description,
      image: buildImg(i.image),
    })),
    /* CampaignPerformance rows */
    performance: arr<any>(d.performances).map((p) => ({
      id: p._id,
      title: p.title ?? p.performance_title,
      sub_title: p.subTitle ?? p.sub_title ?? "",
      description: p.description ?? p.performanceDescription,
      image: buildImg(p.performance_image || p.image),
    })),
    /* Tab categories (items fetched per-tab via the sources below). */
    other_activity_category: arr<any>(d.other_activities).map((c) => ({
      id: c._id,
      category_name: c.name,
    })),
    content_created_category: arr<any>(d.content_created).map((c) => ({
      id: c._id,
      category_name: c.name,
      navigate_to: c.navigateTo,
    })),
    continuity_category: arr<any>(d.community_programs).map((c) => ({
      id: c._id,
      category_name: c.name,
      description: c.description,
    })),
    /* FAQ section reads the embedded faqs[] off the item doc. */
    faqs: arr<any>(d.faqs).map((f) => ({
      question: f.question,
      answer: f.answer,
    })),
  };
};

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

const adaptOurAdvantage = (m: MongoOurAdvantage) => {
  /* The api stores the advantage's stats as flat numbered scalars
     (action_number_1..7 / action_title_1..7) and its industry-
     experience rows as exp_number_/exp_title_/exp_img_1..7. The
     WhyCocomaDigital section reads structured `metrics[]` +
     `industryExperience{ description, metrics[] }`, so fold the flat
     fields into those shapes here. */
  const seven = [1, 2, 3, 4, 5, 6, 7];
  return {
    ...m,
    id: m._id,
    order: (m as any).display_order,
    legacyImageUrl: buildImg((m as any).image || (m as any).advantage_icon),
    description: (m as any).action_description,
    video_url: (m as any).video_url || "",
    image: buildImg((m as any).image),
    metrics: seven
      .map((n) => ({
        number: (m as any)[`action_number_${n}`],
        title: (m as any)[`action_title_${n}`],
      }))
      .filter((x) => x.number || x.title),
    industryExperience: {
      description: (m as any).exp_description,
      metrics: seven
        .map((n) => ({
          number: (m as any)[`exp_number_${n}`],
          title: (m as any)[`exp_title_${n}`],
          img: buildImg((m as any)[`exp_img_${n}`]),
        }))
        .filter((x) => x.number || x.title),
    },
  };
};

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
  name?: string;
  displayOrder?: number;
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
  subtitle: sec.name,
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
    /* Case-study detail (/case-studies/[slug]) — the story content
       lives on the Client entity (admin → Home → Success Stories):
       title, rich HTML description, image, author / book-call refs.
       The project list above (/common/success-stories) carries no
       slugs, so slug lookups must hit the client detail endpoint. */
    bySlug: async (slug) => {
      const c = await apiGet<any>(
        `/client/detail/${encodeURIComponent(slug)}`,
      );
      if (!c) return null;
      const author =
        c.authorTemplateId && typeof c.authorTemplateId === "object"
          ? c.authorTemplateId
          : null;
      const bookCall =
        c.bookCallTemplateId && typeof c.bookCallTemplateId === "object"
          ? c.bookCallTemplateId
          : null;
      return {
        id: c._id,
        slug: c.slug,
        title: c.title,
        client_name: c.title,
        description: c.description,
        image: buildImg(c.image),
        legacyImageUrl: buildImg(c.image),
        author_id: author?._id ?? c.authorTemplateId ?? null,
        author,
        book_call_id: bookCall?._id ?? c.bookCallTemplateId ?? null,
        order: c.displayOrder,
      };
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
      let docs = (data ?? []).map(adaptOurAdvantage);
      /* The marketing case-study "Why … Grow With Us" section looks up
         a single advantage by its id (the item's our_advantage_template
         _id). */
      const where = opts.where as any;
      const idEq = where?.id?.equals;
      if (idEq !== undefined) {
        docs = docs.filter((d) => String(d.id) === String(idEq));
      }
      return listResult(docs, opts.limit);
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
  "creative-categories": {
    list: async (opts) => {
      const cats = await apiGet<MongoCreativeCategory[]>("/creative", {
        revalidate: opts.revalidate,
      });
      const docs = (cats ?? []).map((c) => ({
        id: c._id,
        name: c.name,
        name: c.name,
        slug: c.slug,
        slug: c.slug,
        order: c.display_order,
      }));
      return listResult(docs, opts.limit);
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
      const catSlug = where?.["category.slug"]?.equals;
      if (catSlug !== undefined) {
        items = items.filter((s) => s.category?.slug === catSlug);
      }
      const titleQ = (where?.title?.contains ?? where?.title?.like) as
        | string
        | undefined;
      if (titleQ) {
        const q = String(titleQ).toLowerCase();
        items = items.filter((s) =>
          String(s.title ?? "").toLowerCase().includes(q),
        );
      }
      items.sort(byOrder);
      return pagedResult(items, opts.limit, opts.page);
    },
    /* Detail lookup hits the api's dedicated single-item endpoint so
       the SingleVideo page gets the full item + approaches + final
       outputs (the list endpoint only carries thumbnail-card fields). */
    bySlug: async (slug) => {
      const data = await apiGet<any>(
        `/creative/single/${encodeURIComponent(slug)}`,
      );
      return data?.item ? adaptCreativeDetail(data) : null;
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
      /* Title search — the /work/marketing-campaigns search box sends
         where[title][contains]. Match case-insensitively on the item
         title (falling back to the legacy title field
         on rows that don't carry `title`). */
      const titleQuery = where?.title?.contains ?? where?.title?.like;
      if (titleQuery) {
        const q = String(titleQuery).trim().toLowerCase();
        if (q) {
          items = items.filter((s) =>
            (s.title || (s as any).title || "")
              .toLowerCase()
              .includes(q),
          );
        }
      }
      items.sort(byOrder);
      /* Paginate by page — the /work/marketing-campaigns grid is
         page-based (32/page). listResult always returned the first
         page, so page 2+ showed the same items; pagedResult slices
         the requested page and reports real totalDocs/totalPages. */
      return pagedResult(items, opts.limit, opts.page);
    },
    /* Detail lookup hits the dedicated single-item endpoint so the
       /marketing/<slug> case-study page gets the full item + every
       sub-collection (stats, strategy, performance, slider, tab
       categories) instead of just the thumbnail-card fields. */
    bySlug: async (slug) => {
      const data = await fetchMarketingDetail(slug);
      return data?.item ? adaptMarketingDetail(data) : null;
    },
  },
  /* ── Per-tab item sources for the marketing case-study page ──────
     OtherActivities / ContentCreateByTeam / ContinuityProgram fetch
     their active tab's items via these collections, keyed by the
     parent item slug + category_name. All resolve from the same
     /marketing/single payload (the flat per-item endpoints aren't
     mounted), so one cached call backs every tab. */
  "other-activities": {
    list: async (opts) => {
      const where = (opts.where ?? {}) as any;
      const slug = where.item_slug?.equals;
      const name = where.category_name?.equals;
      if (!slug) return listResult([], opts.limit);
      const d = await fetchMarketingDetail(slug, opts.revalidate);
      const cats = arr<any>(d?.other_activities);
      const cat = name ? cats.find((c) => c.name === name) : cats[0];
      /* Each activity row carries up to 4 image/video pairs; the
         renderer collapses N docs into one activity (title/desc from
         the first) with a media slider, so expand each pair into its
         own doc carrying the shared title/description. */
      const docs: any[] = [];
      for (const it of arr<any>(cat?.items)) {
        let pairs = [
          { image: it.image1, video: it.video1 },
          { image: it.image2, video: it.video2 },
          { image: it.image3, video: it.video3 },
          { image: it.image4, video: it.video4 },
        ].filter((m) => m.image || m.video);
        // Records created via the single-image form carry `image`/`video_url`
        // instead of the image1..4/video1..4 pairs — fall back to those.
        if (!pairs.length && (it.image || it.video_url)) {
          pairs = [{ image: it.image, video: it.video_url }];
        }
        // Still surface text-only items (no media yet) so they're not dropped.
        if (!pairs.length) pairs = [{ image: "", video: "" }];
        for (const m of pairs) {
          docs.push({
            id: it._id,
            title: it.title,
            description: it.description,
            legacyImageUrl: buildImg(m.image),
            video_url: m.video || "",
          });
        }
      }
      return listResult(docs, opts.limit);
    },
  },
  "continuity-program-items": {
    list: async (opts) => {
      const where = (opts.where ?? {}) as any;
      const slug = where.item_slug?.equals;
      const name = where.category_name?.equals;
      if (!slug) return listResult([], opts.limit);
      const d = await fetchMarketingDetail(slug, opts.revalidate);
      const cats = arr<any>(d?.community_programs);
      const cat = name
        ? cats.find((c) => c.name === name)
        : cats[0];
      const docs = arr<any>(cat?.items).map((it) => ({
        id: it._id,
        marketingHouseItemId: it.marketingHouseItemId,
        thumbnail: buildImg(
          it.videoThumbnail || it.item_image,
        ),
        upload_video: buildImg(it.videoFile),
        videoUrl: it.videoUrl,
        description:
          it.description,
      }));
      return listResult(docs, opts.limit);
    },
  },
  "content-created-items": {
    list: async (opts) => {
      const where = (opts.where ?? {}) as any;
      const slug = where.item_slug?.equals;
      const name = where.category_name?.equals;
      if (!slug) return pagedResult([], opts.limit, opts.page);
      const d = await fetchMarketingDetail(slug, opts.revalidate);
      const cats = arr<any>(d?.content_created);
      const cat = name ? cats.find((c) => c.name === name) : cats[0];
      const docs = arr<any>(cat?.items).map((it) => ({
        id: it._id,
        image: buildImg(it.image),
        url: it.url || it.item_video_url || "",
        title: it.item_title,
      }));
      return pagedResult(docs, opts.limit, opts.page);
    },
  },
  "content-created-carousels": {
    list: async (opts) => {
      const where = (opts.where ?? {}) as any;
      const slug = where.item_slug?.equals;
      const name = where.category_name?.equals;
      if (!slug) return pagedResult([], opts.limit, opts.page);
      const d = await fetchMarketingDetail(slug, opts.revalidate);
      /* Carousels carry a content-created category id, not a name;
         resolve the active tab's category id by name first. */
      const cats = arr<any>(d?.content_created);
      const cat = name ? cats.find((c) => c.name === name) : cats[0];
      const catId = cat?._id;
      const docs = arr<any>(d?.carousels)
        .filter(
          (c) =>
            !catId ||
            c.marketingHouseContentCreatedCategoryId === catId,
        )
        .map((c) => ({
          id: c._id,
          image: buildImg(c.image || c.carousel_image),
          carousel_order: c.carousel_order,
          url: "",
        }));
      return pagedResult(docs, opts.limit, opts.page);
    },
  },
  jobs: {
    list: async (opts) => {
      /* `/job/list` is the paginated admin-style endpoint and
         defaults to limit=10 server-side when no page params are
         sent — it was silently capping the public listing to the
         first 10 active jobs. `/job` (no path suffix) is the
         unrestricted "all active jobs" endpoint; use that instead
         so every active job shows up. */
      const data = await apiGet<MongoJob[]>("/job", {
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
    bySlug: async (slug) => {
      const data = await apiGet<{
        service?: any;
        categories?: any[];
        topBanner?: any[];
      }>(`/service/group-service/${encodeURIComponent(slug)}`);
      const s = data?.service;
      if (!s) return null;
      return {
        id: s._id,
        title: s.title,
        slug: s.slug,
        description: s.description,
        featured_description: s.featuredDescription ?? s.featured_description,
        image: buildImg(s.image),
        legacyImageUrl: buildImg(s.image),
        category: { id: s.serviceCategoryId },
        group_top_banner: (data.topBanner ?? []).map((b: any) => ({
          heading: b.heading,
          subheading: b.subHeading,
          image: buildImg(b.image),
          legacyImageUrl: buildImg(b.image),
          video: b.video,
          video_url: b.video,
          button_text: b.buttonText,
          cta_text: b.buttonText,
          cta_url: b.buttonUrl,
        })),
        /* The "FOR <audience>" sliding sections: group_services_category
           (sections) → group_service_item (cards). The page/Services
           view map cat.items → api_group_service_items (reading title,
           description, slug, thumbnail from legacyImageUrl). */
        group_single_service_portfolio_category: (data.categories ?? []).map(
          (cat: any) => ({
            id: cat._id,
            category_name: cat.group_service_category_name,
            display_direction: cat.display_direction,
            items: (cat.items ?? []).map((it: any) => ({
              id: it._id,
              title: it.group_service_item_title,
              slug: it.group_service_slug,
              description: it.group_service_item_description,
              legacyImageUrl: buildImg(it.group_service_item_thumbnail),
            })),
          }),
        ),
      };
    },
  },
  /* GroupServiceItem detail — the sub-service tier one level below the
     top-level service (e.g. "Title Launch Campaign Videos" under
     "Marketing House"). These have their own slug
     (group_service_slug) and detail endpoint; a /service/[slug] visit
     for one of these falls back here when the top-level `services`
     lookup above finds nothing. */
  "group-service-items": {
    bySlug: async (slug) => {
      const data = await apiGet<{
        service?: any;
        portfolio?: any[];
        faqs?: any[];
      }>(`/service/single-service/${encodeURIComponent(slug)}`);
      const s = data?.service;
      if (!s) return null;
      return {
        id: s._id,
        title: s.group_service_item_title,
        slug: s.group_service_slug,
        description: s.group_service_item_description,
        short_description: s.group_service_item_description2,
        featured_description: s.group_service_item_description,
        image: buildImg(s.group_service_item_thumbnail),
        legacyImageUrl: buildImg(s.group_service_item_thumbnail),
        group_service_item_title: s.group_service_item_title,
        group_service_item_description: s.group_service_item_description,
        category: { id: s.group_service_category_id },
        group_top_banner: [],
        group_single_service_portfolio_category: (data?.portfolio ?? []).map(
          (cat: any) => ({
            id: cat._id,
            category_name: cat.portfolio_category_name,
            items: (cat.items ?? []).map((it: any) => ({
              id: it._id,
              title: it.portfolio_item_title,
              slug: it.slug || "",
              image: buildImg(it.portfolio_item_image),
              video_url: it.portfolio_item_video_url,
              description: it.portfolio_item_title,
            })),
          }),
        ),
        faqs: (data?.faqs ?? []).map((f: any) => ({
          id: f._id,
          question: f.question,
          answer: f.answer,
        })),
        meta_title: null,
        meta_description: null,
      };
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
      let posts = (data ?? []).map(adaptBlogPost);
      const where = opts.where as any;
      /* Category-filter bar sends where[category.slug][equals]; the
         search box sends where[title][contains]. /blog/items returns
         the full list, so filter + paginate here. */
      const catSlug = where?.["category.slug"]?.equals;
      if (catSlug !== undefined) {
        posts = posts.filter((p) => p.category?.slug === catSlug);
      }
      const titleQ = where?.title?.contains ?? where?.title?.like;
      if (titleQ) {
        const q = String(titleQ).toLowerCase();
        posts = posts.filter((p) =>
          String(p.title ?? "").toLowerCase().includes(q),
        );
      }
      return pagedResult(posts, opts.limit, opts.page);
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
  /* No detail endpoint: fetch the list and match on slug (list
     adapters don't filter by slug, so we can't rely on a where). */
  const res = await findCollection<T>(collection, { ...opts, limit: 2000 });
  return (
    ((res.docs as Array<{ slug?: string }>).find((d) => d?.slug === slug) ??
      null) as T | null
  );
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

/** Service detail (/services/[slug]) — parent service + its top
    banner(s). Resolved via the services `bySlug` source (the API's
    group-service endpoint), shared with the client shim. */
export const getService = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("services", slug, opts);

/** GroupServiceItem detail (the sub-service tier) — fallback for
    /service/[slug] when the slug isn't a top-level service. */
export const getGroupServiceItem = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("group-service-items", slug, opts);

export const getServiceCategories = (opts?: FetchOpts) =>
  findCollection<any>("service-categories", { sort: "order", ...opts });

export const getCreativeHouseItems = (opts?: FetchOpts) =>
  findCollection<any>("creative-house-items", { sort: "order", ...opts });

export const getCreativeHouseItem = (slug: string, opts?: FetchOpts) =>
  findBySlug<any>("creative-house-items", slug, opts);

/** Creative-house filter categories (Videos 16:9, Shorts & Reels, …) —
    the taxonomy the /creative-house grid filters by. Backed by the
    `creative-categories` source (api `/creative`). */
export const getCreativeCategories = (opts?: FetchOpts) =>
  findCollection<any>("creative-categories", { sort: "order", ...opts });

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

/** Homepage hero — the admin-managed Top Banner (admin panel →
    Home → Top Banners) served by the API's GET /home endpoint.
    Returns the active banner doc (heading / subHeading / videoUrl /
    videoThumbnail / buttonText) or null when no active banner
    exists. */
export const getHomeTopBanner = async (opts?: {
  revalidate?: number;
  lang?: string;
}) => {
  const data = await apiGet<{ topBanner?: any }>("/home", {
    revalidate: opts?.revalidate,
    searchParams: opts?.lang ? { lang: opts.lang } : undefined,
  });
  return data?.topBanner ?? null;
};

/** Homepage "Growth at a glance" stat tiles — admin-managed (admin
    panel → Home → Growth at a glance → Stats) via GET /home/growth-stats.
    Each stat renders as `${prefix}${value}${suffix}` above its label. */
export const getHomeGrowthStats = async (opts?: { revalidate?: number }) => {
  const data = await apiGet<{ growthStats?: any[] }>("/home/growth-stats", {
    revalidate: opts?.revalidate,
  });
  return (data?.growthStats ?? []).map((s: any) => ({
    id: s._id,
    prefix: s.prefix ?? "",
    value: Number(s.value) || 0,
    suffix: s.suffix ?? "",
    label: s.label ?? "",
  }));
};

/** Homepage "Latest Success Stories" rail — rich client case-study
    data from the API's /home/client endpoint (title / image / slug /
    description). Adapted to the legacy client_* card shape the Home
    view components consume. */
export const getHomeClients = async (opts?: { revalidate?: number }) => {
  const data = await apiGet<{ client?: any[] }>("/home/client", {
    revalidate: opts?.revalidate,
  });
  return (data?.client ?? []).map((c: any) => ({
    id: c._id,
    slug: c.slug,
    client_img: buildImg(c.image),
    client_title: c.title,
    client_description: c.description,
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
