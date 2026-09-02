/**
 * Where each piece of the public site is edited in the admin panel.
 *
 * ONE place that knows admin URLs. Before this, edit links were written inline
 * at ~49 call sites against a route scheme the admin panel no longer has
 * ("/home/service/service_item/show/:id" — Laravel-era paths, one of them
 * carrying a "/home/roup/" typo that nobody ever noticed because the component
 * they were passed to had been stubbed out to render nothing). Route strings
 * scattered through the view layer cannot be checked; a catalogue can, and
 * scripts/verify-admin-routes.mjs checks every entry below against the admin
 * router's own route table.
 *
 * ADDING A ROUTE: add a builder here, not a template literal in a component.
 * The path must match a <Route path=...> in app/admin/src/App.tsx.
 *
 * PERMISSIONS: the owning module is derived from the path rather than passed
 * by the caller. The admin resolves a route's module by longest-prefix match
 * over MODULES (app/admin/src/features/auth/permissions.ts); mirroring that
 * here means a pencil can never claim a module its target route does not
 * belong to, and there is no second list to keep in step.
 */

/** Mirror of MODULES in app/admin/src/features/auth/permissions.ts.
 *  Keys are the contract with app/api/src/config/adminModules.js. */
const MODULE_PREFIXES: ReadonlyArray<readonly [module: string, prefix: string]> = [
  ["home", "home"],
  ["home", "settings"],
  ["marketing", "marketing"],
  ["creative", "creative"],
  ["development", "development"],
  ["group-service", "group-service"],
  ["growth-services", "growth-services"],
  ["podcast", "podcast"],
  ["blog", "blog"],
  ["gallery", "gallery"],
  ["templates", "templates"],
  ["jobs", "jobs"],
  ["contact", "contact"],
];

/**
 * The permission module that owns an admin path, by longest-prefix match.
 *
 * Longest wins for the same reason it does in the admin: a plain startsWith
 * would let a "group-service/..." path resolve against a shorter, unrelated
 * prefix and hand the pencil the wrong module.
 */
export function moduleForAdminPath(path: string): string | null {
  const clean = path.replace(/^\/+/, "").split(/[?#]/)[0];
  let best: { module: string; len: number } | null = null;
  for (const [module, prefix] of MODULE_PREFIXES) {
    const matches = clean === prefix || clean.startsWith(`${prefix}/`);
    if (matches && (!best || prefix.length > best.len)) {
      best = { module, len: prefix.length };
    }
  }
  return best ? best.module : null;
}

/** An id that is missing, empty or a stringified null is not addressable. */
const usable = (id?: string | number | null): id is string | number =>
  id !== undefined && id !== null && id !== "" && id !== "undefined" && id !== "null";

/**
 * A record's own edit form, or its list when the id is unknown.
 *
 * Falling back to the list rather than returning null is deliberate: a card
 * whose id the public payload does not carry still has a home in the admin,
 * and dropping the editor at the list beats dropping them nowhere. A link
 * built with an undefined id would open ".../edit/undefined", which is how
 * several of the old inline links behaved.
 */
const record = (list: string, id?: string | number | null, segment = "edit") =>
  usable(id) ? `${list}/${segment}/${id}` : list;

/**
 * A child list addressed by parent and record.
 *
 * The admin's child-list pages open the row's own modal when handed an
 * `editId` and scope their filter to the parent — the same contract the
 * podcast page's pencils already use. Written as a query rather than a path
 * because these collections have no "/edit/:id" route of their own.
 */
function childList(
  list: string,
  parentKey: string,
  parentId?: string | number | null,
  id?: string | number | null,
): string {
  const params = new URLSearchParams();
  if (usable(parentId)) params.set(parentKey, String(parentId));
  if (usable(id)) params.set("editId", String(id));
  const query = params.toString();
  return query ? `${list}?${query}` : list;
}

export const adminRoutes = {
  /* ── Home ────────────────────────────────────────────────────────────── */
  home: {
    topBanner: (id?: string | number | null) => record("home/top-banner", id),
    brands: () => "home/brands",
    brand: (id?: string | number | null) => record("home/brands", id),
    serviceDepartment: (id?: string | number | null) => record("home/service-department", id),
    serviceCategory: (id?: string | number | null) => record("home/service-category", id),
    video: (id?: string | number | null) => record("home/video", id),
    growthStat: (id?: string | number | null) => record("home/growth-stats", id),
    client: (id?: string | number | null) => record("home/client", id),
    /* The home page's own section rows live under /settings, which the admin
       maps to the `home` module too — hence both prefixes above. */
    section: (id?: string | number | null) => record("settings/home-sections", id),
    sectionItem: (id?: string | number | null) => record("settings/home-section-items", id),
  },

  /* ── Common templates ────────────────────────────────────────────────── */
  templates: {
    author: (id?: string | number | null) => record("templates/author", id),
    bannerTitle: (id?: string | number | null) => record("templates/banner-title", id),
    bookCall: (id?: string | number | null) => record("templates/book-call", id),
    userChoice: (id?: string | number | null) => record("templates/user-choice", id),
    ourAdvantage: (id?: string | number | null) => record("templates/our-advantage", id),
    successStoriesProject: (id?: string | number | null) =>
      record("templates/success-stories-project", id),
    page: (id?: string | number | null) => record("templates/page", id),
  },

  /* ── Blog ────────────────────────────────────────────────────────────── */
  blog: {
    categories: () => "blog/category",
    category: (id?: string | number | null) => record("blog/category", id),
    subCategories: () => "blog/sub-category",
    subCategory: (id?: string | number | null) => record("blog/sub-category", id),
    post: (id?: string | number | null) => record("blog/item", id),
  },

  /* ── Jobs ────────────────────────────────────────────────────────────── */
  jobs: {
    categories: () => "jobs/category",
    category: (id?: string | number | null) => record("jobs/category", id),
    job: (id?: string | number | null) => record("jobs/list", id),
  },

  /* ── Gallery ─────────────────────────────────────────────────────────── */
  gallery: {
    image: (id?: string | number | null) => record("gallery/images", id),
    video: (id?: string | number | null) => record("gallery/videos", id),
  },

  /* ── Creative House ──────────────────────────────────────────────────── */
  creative: {
    categories: () => "creative/category",
    category: (id?: string | number | null) => record("creative/category", id),
    item: (id?: string | number | null) => record("creative/item", id),
    /* Child rows are addressed under their parent item: the admin's list page
       filters by :itemId, so linking to the bare collection would drop the
       editor into every item's rows at once. */
    approach: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`creative/item/${itemId}/approach`, id)
        : record("creative/approach", id),
    finalOutput: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`creative/item/${itemId}/final-output`, id)
        : record("creative/final-output", id),
    project: (id?: string | number | null) => record("creative/project", id),
  },

  /* ── Marketing House ─────────────────────────────────────────────────── */
  marketing: {
    categories: () => "marketing/category",
    category: (id?: string | number | null) => record("marketing/category", id),
    item: (id?: string | number | null) => record("marketing/item", id),
    images: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId) ? record(`marketing/item/${itemId}/images`, id) : "marketing/item",
    statics: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId) ? record(`marketing/item/${itemId}/statics`, id) : "marketing/item",
    performance: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/performance`, id)
        : "marketing/performance",
    ideaStrategy: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/idea-strategy`, id)
        : "marketing/idea-strategy-planning",
    otherActivityCategory: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/other-activity-category`, id)
        : "marketing/add-on-activities-category",
    otherActivityItem: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/other-activity-item`, id)
        : "marketing/add-on-activities-item",
    contentCategory: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/content-category`, id)
        : "marketing/content-category",
    contentItem: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/content-item`, id)
        : "marketing/content-item",
    contentCarousel: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/content-carousel`, id)
        : "marketing/content-carousel",
    communityProgram: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/community-program`, id)
        : "marketing/community-program",
    communityProgramItem: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`marketing/item/${itemId}/community-program-item`, id)
        : "marketing/community-program-item",
    highlights: () => "marketing/highlights",
    posterMedia: () => "marketing/poster-media",
    faq: () => "marketing/faq",
    project: (id?: string | number | null) => record("marketing/project", id),
  },

  /* ── Group Services ──────────────────────────────────────────────────── */
  groupService: {
    topBanner: (id?: string | number | null) => record("group-service/top-banner", id),
    categories: () => "group-service/category",
    category: (id?: string | number | null) => record("group-service/category", id),
    item: (id?: string | number | null) => record("group-service/item", id),
    images: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`group-service/item/${itemId}/images`, id)
        : record("group-service/single-service-image", id),
    recentWork: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`group-service/item/${itemId}/recent-work`, id)
        : record("group-service/recent-work", id),
    portfolioCategory: (itemId?: string | number | null, id?: string | number | null) =>
      usable(itemId)
        ? record(`group-service/item/${itemId}/portfolio-category`, id)
        : record("group-service/portfolio-category", id),
    portfolioItem: (id?: string | number | null) => record("group-service/portfolio-item", id),
    creatorPlatform: (id?: string | number | null) => record("group-service/creator-platform", id),
    successStory: (id?: string | number | null) => record("group-service/success-stories", id),
    faq: (id?: string | number | null) => record("group-service/faq", id),
    serviceDepartment: (id?: string | number | null) =>
      record("group-service/service-department", id),
    serviceCategory: (id?: string | number | null) => record("group-service/service-category", id),
  },

  /* ── Growth Services ─────────────────────────────────────────────────── */
  growth: {
    service: (id?: string | number | null) => record("growth-services/service", id),
    /* These have no per-record route in the admin router — they are edited in
       a modal on their list page — so the id travels as a query the list
       reads, exactly as the podcast child lists do. */
    section: (serviceId?: string | number | null, id?: string | number | null) =>
      childList("growth-services/section", "growthServiceId", serviceId, id),
    feature: (serviceId?: string | number | null, id?: string | number | null) =>
      childList("growth-services/feature", "growthServiceId", serviceId, id),
    stat: (serviceId?: string | number | null, id?: string | number | null) =>
      childList("growth-services/stat", "growthServiceId", serviceId, id),
    showcase: (serviceId?: string | number | null, id?: string | number | null) =>
      childList("growth-services/showcase", "growthServiceId", serviceId, id),
    caseMetric: (serviceId?: string | number | null, id?: string | number | null) =>
      childList("growth-services/case-metric", "growthServiceId", serviceId, id),
    faq: (serviceId?: string | number | null, id?: string | number | null) =>
      childList("growth-services/faq", "growthServiceId", serviceId, id),
    cta: (serviceId?: string | number | null, id?: string | number | null) =>
      childList("growth-services/cta", "growthServiceId", serviceId, id),
    content: (serviceId?: string | number | null, id?: string | number | null) =>
      childList("growth-services/content", "growthServiceId", serviceId, id),
  },

  /* ── Podcast ─────────────────────────────────────────────────────────── */
  podcast: {
    pageStep: (pageId: string, step: number) => `podcast/page/edit/${pageId}?step=${step}`,
  },

  /* ── Contact / meetings ──────────────────────────────────────────────── */
  contact: {
    submissions: () => "contact/contact-us",
    meetings: () => "contact/meetings",
    availability: () => "contact/meeting-availability",
  },
} as const;
