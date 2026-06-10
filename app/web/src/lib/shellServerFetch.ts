// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShellServiceCategory {
  id: number;
  category_name: string;
  slug?: string;
  featuredOnHomepage?: boolean;
  homepageOrder?: number;
  [key: string]: unknown;
}

export interface ShellNavService {
  id: number;
  title?: string;
  slug?: string;
  image?: string;
  button_text?: string;
  [key: string]: unknown;
}

export interface ShellFooterItem {
  slug?: string;
  service_title?: string;
  [key: string]: unknown;
}

/* Phase 8b 2026-05-25: data-driven solutions nav. Header + footer +
   AudienceSolutionsGrid all read from the `solutions-pages` the API
   collection (filtered to is_active) instead of hard-coded arrays.
   Adding a new solution doc auto-surfaces it in nav. */
export interface ShellSolutionNavItem {
  slug: string;
  label: string;
}

export interface ShellData {
  serviceCategories: ShellServiceCategory[];
  initialServices: ShellNavService[];
  serviceItems: ShellFooterItem[];
  otherServices: ShellFooterItem[];
  solutions: ShellSolutionNavItem[];
}

/* Phase 8b 2026-05-25: keep nav populated when the solutions-pages
   collection is empty. Mirrors the 10 slugs that have hard-coded
   /solutions/<slug> routes — once the import-solutions-pages
   migration runs + populates the API, the live list takes over. */
const LEGACY_SOLUTIONS: ShellSolutionNavItem[] = [
  { slug: "youtube-creators", label: "YouTube Creators" },
  { slug: "ott-platforms", label: "OTT Platforms" },
  { slug: "music-labels", label: "Music Labels" },
  { slug: "film-studios", label: "Film Studios" },
  { slug: "podcasters", label: "Podcasters" },
  { slug: "d2c-brands", label: "D2C Brands" },
  { slug: "real-estate-brands", label: "Real Estate Brands" },
  { slug: "educational-hubs", label: "Educational Hubs" },
  { slug: "international-agencies", label: "International Agencies" },
  { slug: "independent-artists", label: "Independent Artists" },
];

// ─── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Site shell data — header megamenu + footer columns.
 *
 * Phase 5h: pure the API (zero Laravel reads). Replaces the legacy
 *   /common-api + /service_home_priority pair.
 *
 *   - serviceCategories → service-categories collection (excludes
 *     the "Our Other Services" orphan, which feeds otherServices
 *     in the footer instead)
 *   - initialServices   → services collection, filtered to the
 *     first category, limit 6 (drives header megamenu first tab)
 *   - serviceItems      → services collection, all main-rail
 *     services (footer "Services" column)
 *   - otherServices     → services in "Our Other Services" category
 *     (footer "By Platform" column)
 *
 * All downstream consumers (site-shell, header, CocomaFooter) keep
 * the same prop contract — adapter shapes each the API doc to the
 * legacy {service_title, slug, image, title, …} field names.
 */
export async function fetchShellData(): Promise<ShellData> {
  const { getServiceCategories, getServices, getSolutionsPages, imageUrl } =
    await import("./content");

  const categoriesResult = await getServiceCategories({ limit: 50 });
  const allCategories = (categoriesResult.docs || []).map((c: any) => ({
    id: c.id,
    category_name: c.category_name,
    slug: c.slug,
    featuredOnHomepage: Boolean(c.featuredOnHomepage),
    homepageOrder: typeof c.homepageOrder === "number" ? c.homepageOrder : 999,
  }));

  const otherServicesCategory = allCategories.find(
    (c) => c.category_name === "Our Other Services",
  );
  /* Phase 5+ 2026-05-23: keep "Our Other Services" in the list so the
     header megamenu can render its 5th left-rail button — the header
     decides what to show, not the fetcher. Live shows: 4 featured
     categories (Content/Growth/Monetisation/Management) + "OUR OTHER
     SERVICES" as a 5th tab. Previously this category was stripped
     here, which caused the local header to fall back to *every*
     non-featured skill row (Videos, Shorts, Thumbnails, …) instead. */
  const serviceCategories = allCategories;

  /* Wave 2 — three independent service queries in parallel:
     (1) initialServices for the megamenu's first-tab content
     (2) all main-rail services for the footer's Services column
     (3) Other Services for the footer's By Platform column

     Phase 5+ 2026-05-23: the header megamenu's first tab is the
     lowest-homepageOrder featured category (Content), not the first
     row in the table. Otherwise on a fresh import the "Videos
     (16:9)" sub-skill would land first and the megamenu would open
     to a category that doesn't even appear in its left rail. */
  const featuredCategories = serviceCategories
    .filter((c) => c.featuredOnHomepage)
    .sort((a, b) => (a.homepageOrder ?? 999) - (b.homepageOrder ?? 999));
  const firstCategoryId = featuredCategories[0]?.id ?? serviceCategories[0]?.id;
  const [initialServicesResult, mainServicesResult, otherServicesResult] =
    await Promise.all([
      firstCategoryId
        ? getServices({
            where: { category: { equals: firstCategoryId } },
            limit: 6,
          })
        : Promise.resolve({ docs: [] as any[] }),
      getServices({
        where: { category: { not_equals: otherServicesCategory?.id ?? -1 } },
        limit: 50,
      }),
      otherServicesCategory
        ? getServices({
            where: { category: { equals: otherServicesCategory.id } },
            limit: 50,
          })
        : Promise.resolve({ docs: [] as any[] }),
    ]);

  const initialServices: ShellNavService[] = (initialServicesResult.docs || []).map(
    (s: any) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      image: imageUrl(s),
      button_text: undefined,
    }),
  );

  /* Footer items expect `{slug, service_title}` — adapt accordingly.
     Empty/placeholder titles ("-") get filtered to match the
     legacy guard that removed the same noise from /common-api. */
  const adaptFooter = (docs: any[]): ShellFooterItem[] =>
    docs
      .map((s) => ({
        id: s.id,
        slug: s.slug,
        service_title: s.title,
      }))
      .filter(
        (it) => it.service_title && String(it.service_title).trim() !== "-",
      );

  /* Phase 8b: solutions list for header dropdown, footer column,
     and AudienceSolutionsGrid. Filtered to is_active=true, sorted
     by order. Falls back to the LEGACY_SOLUTIONS list below when
     the collection is empty or unreachable — keeps nav populated
     before the import-solutions-pages migration has been run + on
     fresh checkouts that haven't seeded the collection yet. Once
     editors are managing this in /admin or Studio, the live list
     wins. */
  let solutions: ShellSolutionNavItem[] = [];
  try {
    const solutionsResult = await getSolutionsPages({ limit: 50, depth: 0 });
    solutions = (solutionsResult.docs || [])
      .map((d: any) => ({
        slug: String(d.slug || ""),
        label: String(d.title || ""),
      }))
      .filter((s) => s.slug && s.label);
  } catch {
    /* Fall through to fallback below. */
  }
  if (solutions.length === 0) solutions = LEGACY_SOLUTIONS;

  return {
    serviceCategories,
    initialServices,
    serviceItems: adaptFooter(mainServicesResult.docs || []),
    otherServices: adaptFooter(otherServicesResult.docs || []),
    solutions,
  };
}
