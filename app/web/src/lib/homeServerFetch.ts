// ─── Types ────────────────────────────────────────────────────────────────────

export interface HomeTopBanner {
  id: number;
  heading?: string;
  sub_heading?: string;
  banner_video_url?: string;
  banner_button_text?: string;
  book_call_template_id?: number;
}

export interface OtherServiceItem {
  id: number | string;
  slug?: string;
  service_image?: string;
  service_title?: string;
  service_button_text?: string;
}

export interface GrowthVideo {
  id?: number | string;
  video_url?: string;
  video_thumbnail?: string;
}

export interface ClientCaseStudyItem {
  id: number | string;
  slug?: string;
  client_img?: string;
  client_title?: string;
  client_description?: string;
}

export interface HomeData {
  top_banner?: HomeTopBanner;
  other_service?: OtherServiceItem[];
  video?: GrowthVideo;
  client?: ClientCaseStudyItem[];
}

export interface YoutubeSection {
  category?: string;
  items?: Record<string, unknown>[];
}

export interface ServiceItem {
  id: number;
  title?: string;
  slug?: string;
  image?: string;
  button_text?: string;
  [key: string]: unknown;
}

export interface ServiceCategory {
  id: number;
  category_name: string;
  [key: string]: unknown;
}

export interface BookCallData {
  id: number;
  book_button_text?: string;
  book_image?: string;
  book_heading?: string;
  book_title1?: string;
  book_description1?: string;
  book_title2?: string;
  book_description2?: string;
}

export interface HireUsItem {
  user_choice_title?: string;
  user_choice_description?: string;
  user_choice_button_text?: string;
}

export interface BrandItem {
  id: number | string;
  brand_name?: string;
  brand_image?: string;
}

export interface HomePageServerData {
  homeData: HomeData | null;
  youtubeData: YoutubeSection[] | null;
  servicesByCategory: Record<number, ServiceItem[]>;
  serviceCategories: ServiceCategory[];
  bookCallData: BookCallData | null;
  hireUsItems: HireUsItem[];
  brands: BrandItem[];
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Homepage fetch — Phase 5g: fully the API, zero Laravel reads.
 *
 * Sources (all the API now):
 *   - serviceCategories       → service-categories collection
 *   - servicesByCategory      → services collection (per category)
 *   - youtubeData             → home-youtube-cards collection
 *   - homeData.top_banner     → homepage-content global (hero group)
 *   - homeData.other_service  → services collection (Our Other Services category)
 *   - homeData.video          → homepage-content global (growth_video group)
 *   - homeData.client         → success-stories collection (top 6 by order)
 *   - bookCallData            → book-call-templates collection
 *   - hireUsItems             → hire-us-content global (user_choices.items)
 *   - brands                  → brands collection
 *
 * Same return shape so the Home view component doesn't change.
 * Each the API helper has a graceful empty-fallback so a missing
 * doc renders the skeleton placeholder rather than 500ing.
 */
export async function fetchHomePageData(
  _lang = "en"
): Promise<HomePageServerData> {
  /* Import the API helpers inline so this module stays compatible
     when imported in tests / build steps that don't have Next's
     fetch cache. */
  const {
    getServiceCategories,
    getServices,
    getHomeYoutubeCards,
    getHomepageContent,
    getHireUsContent,
    getBookCallTemplate,
    getHomeClients,
    getBrands,
    imageUrl,
  } = await import("./content");

  // Wave 1 — independent collections / globals in parallel.
  // depth=2 on the global expands the new featured relationship
  // arrays (HomepageContent.sections.other_services.featured +
  // .success_stories.featured) into full docs we can read images
  // from in one round-trip.
  const [
    homepageGlobal,
    youtubeFromPayload,
    payloadCategoriesResult,
    brandsResult,
    hireUsContent,
  ] = await Promise.all([
    getHomepageContent({ depth: 2 }),
    /* limit: 100 so all 66 imported home-youtube-cards come back
       in one round-trip (was 50, capped at "Featured" generation).
       sort by legacyId preserves original Laravel section order
       (channels → web-series → music → films → reality → talents). */
    getHomeYoutubeCards({ limit: 100, sort: "legacyId" }),
    /* Phase 5+ 2026-05-22: only the categories Pearl has flagged
       as featured-on-homepage come back, sorted by homepageOrder.
       Falls through if NO category is flagged (legacy behavior —
       all categories returned, sorted by `order`) so a freshly-
       seeded DB still renders something. */
    getServiceCategories({
      where: { featuredOnHomepage: { equals: true } },
      sort: "homepageOrder",
      limit: 20,
    }),
    getBrands({ limit: 50 }),
    getHireUsContent({ depth: 1 }),
  ]);

  /* Adapt the API Brand → legacy {brand_name, brand_image} shape
     that TrustedBrandsMarquee + TrustedByStrip + about.tsx expect. */
  const brands: BrandItem[] = brandsResult.docs.map((b: any) => ({
    id: b.id,
    brand_name: b.name,
    brand_image: imageUrl(b),
  }));

  /* Top banner — pure the API now, no Laravel merge. Renders only
     if Pearl has filled in HomepageContent.hero in admin; otherwise
     undefined → Home view shows its built-in skeleton/fallback. */
  const payloadHero: any = (homepageGlobal as any)?.hero ?? {};
  const heroBackgroundImageUrl =
    typeof payloadHero.background_image === "object" &&
    payloadHero.background_image?.url
      ? payloadHero.background_image.url
      : undefined;
  /* Phase 5r: HeroBanner ALWAYS renders. When Pearl hasn't filled
     HomepageContent.hero in admin (Phase 5g dropped the Laravel
     fallback that previously hydrated this), fall back to the
     hardcoded brand pitch so the homepage never renders as an
     empty black void. As soon as Pearl fills any single field in
     the admin Hero group, her value overrides the corresponding
     fallback. */
  const HERO_FALLBACK = {
    heading: "India's leading YouTube & Social-media growth studio",
    sub_heading:
      "12B+ organic views. 35,000+ videos. 45M+ subscribers built — for Amazon Prime Video, IMDb, MX Player, B4U, and India's leading OTT platforms.",
    banner_video_url:
      "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/Home-video/1751473566_Cocoma%20Showreel%20-%20Compressed.mp4",
    banner_button_text: "Plan your growth",
  } as const;
  const mergedTopBanner: HomeTopBanner = {
    id: 0,
    heading: payloadHero.headline ?? HERO_FALLBACK.heading,
    sub_heading: payloadHero.subheadline ?? HERO_FALLBACK.sub_heading,
    banner_video_url:
      payloadHero.background_video_url ??
      heroBackgroundImageUrl ??
      HERO_FALLBACK.banner_video_url,
    banner_button_text:
      payloadHero.primary_cta_text || HERO_FALLBACK.banner_button_text,
    book_call_template_id: (payloadHero as any).book_call_template_id,
  };

  /* Adapt the API ServiceCategory → legacy shape the Home view
     expects ({id, category_name}).
     Phase 5+ 2026-05-22: the query above already filtered to
     `featuredOnHomepage: true`. Fallback: when nothing's flagged
     (eg. fresh-seeded DB before someone runs migrate:seed-
     featured-categories), re-query all categories so the rail
     doesn't render empty. */
  let serviceCategoriesRaw = payloadCategoriesResult.docs;
  if (serviceCategoriesRaw.length === 0) {
    console.warn(
      "[homepage] no service-categories flagged featuredOnHomepage. Falling back to all categories. Run `npm run migrate:seed-featured-categories` to fix.",
    );
    const fallback = await getServiceCategories({ limit: 50 });
    serviceCategoriesRaw = fallback.docs;
  }
  const allCategories = serviceCategoriesRaw.map((c: any) => ({
    id: c.id,
    category_name: c.category_name,
    slug: c.slug,
  }));
  /* "Our Other Services" feeds the around-the-channel rail. When
     featuredOnHomepage filtering is in play, this category is
     typically NOT featured, so we look it up separately. */
  let otherServicesCategory = allCategories.find(
    (c) => c.category_name === "Our Other Services",
  );
  if (!otherServicesCategory) {
    const orphanRes = await getServiceCategories({
      where: { slug: { equals: "our-other-services" } },
      limit: 1,
    });
    if (orphanRes.docs[0]) {
      otherServicesCategory = {
        id: orphanRes.docs[0].id,
        category_name: orphanRes.docs[0].category_name,
        slug: orphanRes.docs[0].slug,
      };
    }
  }
  const serviceCategories = allCategories.filter(
    (c) => c.category_name !== "Our Other Services",
  );

  /* Phase 5+ fix 2026-05-22: group HomeYoutubeCards by `subtitle`
     so each Laravel home-page-section renders as its own carousel.
     Previously every card collapsed into ONE "Featured" rail,
     hiding the 6 distinct categories live shows ("60+ YouTube
     Channels", "150+ Web-Series", "200+ Music", "100+ Films",
     "10+ Reality Show", "Talents we're working with").
     The migration preserves the section label in `subtitle` (see
     flattenHomeSections in scripts/migrate-laravel/lib/transforms.ts)
     and `sort: legacyId` keeps items in their original Laravel
     order — so Map insertion order gives us the right section
     sequence too. */
  const sectionBuckets = new Map<string, any[]>();
  for (const card of youtubeFromPayload.docs as any[]) {
    const sectionKey =
      (typeof card.subtitle === "string" && card.subtitle.trim()) ||
      "Featured";
    if (!sectionBuckets.has(sectionKey)) {
      sectionBuckets.set(sectionKey, []);
    }
    sectionBuckets.get(sectionKey)!.push({
      id: card.id,
      /* YouTubeChannels component reads .name + .image + .path —
         alias them so we don't fork the component shape. */
      name: card.title,
      image: imageUrl(card),
      path: card.link,
    });
  }
  const youtubeData: YoutubeSection[] | null =
    sectionBuckets.size > 0
      ? Array.from(sectionBuckets.entries()).map(([category, items]) => ({
          category,
          items,
        }))
      : null;

  /* book_call_template_id falls back to 1 (the default homepage
     template) when laravelBanner doesn't have one. Once
     HomepageContent.hero gets a book_call_template number field,
     prefer that here. */
  const templateId = mergedTopBanner?.book_call_template_id ?? 1;

  /* Pearl's explicit picks for the homepage rails (Phase 5i —
     dedicated schemas on HomepageContent.sections). When set,
     they take priority; otherwise we fall back to the legacy
     auto-pick heuristics so the homepage never goes blank. */
  const sectionsGroup: any = (homepageGlobal as any)?.sections ?? {};
  const featuredOtherServices: any[] = Array.isArray(
    sectionsGroup?.other_services?.featured,
  )
    ? sectionsGroup.other_services.featured
    : [];
  const featuredCaseStudies: any[] = Array.isArray(
    sectionsGroup?.success_stories?.featured,
  )
    ? sectionsGroup.success_stories.featured
    : [];

  // Wave 2 — services rows + book-call template + fallback fetches
  // for any rail Pearl hasn't explicitly populated yet. All in
  // parallel; the conditional fallbacks short-circuit to empty when
  // Pearl has filled the rails.
  const [
    serviceResults,
    otherServicesFallback,
    homeClientsFallback,
    bookCallDoc,
  ] = await Promise.all([
    Promise.all(
      serviceCategories.map(async (cat) => {
        const res = await getServices({
          where: { category: { equals: cat.id } },
          limit: 6,
        });
        const adapted: ServiceItem[] = res.docs.map((s: any) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          image: imageUrl(s),
          short_description: s.short_description,
          /* Phase 5+ fix 2026-05-22: schema doesn't yet have a
             per-service CTA-label field (Pearl can add via admin
             later). Default everything to "Explore Services" so
             cards never render with a bare arrow. Live shows
             "Build strategy" specifically on Content Strategy —
             that's a one-off override we'll wire up when the
             schema field lands. */
          button_text: s.cta_label || "Explore Services",
        }));
        return { id: cat.id, data: adapted };
      })
    ),
    featuredOtherServices.length === 0 && otherServicesCategory
      ? getServices({
          where: { category: { equals: otherServicesCategory.id } },
          limit: 12,
        })
      : Promise.resolve({ docs: [] as any[] }),
    featuredCaseStudies.length === 0
      ? getHomeClients()
      : Promise.resolve([] as ClientCaseStudyItem[]),
    getBookCallTemplate(templateId, { depth: 1 }),
  ]);

  const servicesByCategory: Record<number, ServiceItem[]> = {};
  for (const { id, data } of serviceResults) {
    servicesByCategory[id] = data;
  }

  /* "Around the channel" rail — Pearl's explicit picks first
     (already-expanded docs via depth=2), else fall back to the
     "Our Other Services" category sweep. */
  const otherServicesDocs =
    featuredOtherServices.length > 0
      ? featuredOtherServices.filter((s: any) => s && typeof s === "object")
      : otherServicesFallback.docs;

  const otherService: OtherServiceItem[] = (otherServicesDocs || []).map(
    (s: any) => ({
      id: s.id,
      slug: s.slug,
      service_image: imageUrl(s),
      service_title: s.title,
      /* Phase 5+ fix 2026-05-22: live uses "Explore Services" on
         every around-the-channel card. The earlier "Learn more"
         hardcoded label was a placeholder. */
      service_button_text: s.cta_label || "Explore Services",
    }),
  );

  /* Growth-stats video. Sourced from the homepage-content global when
     present; otherwise a hardcoded fallback so the "Growth at a glance"
     + video section always renders (the section is gated on this value
     in Home.tsx). Mirrors HERO_FALLBACK above. */
  const GROWTH_VIDEO_FALLBACK: GrowthVideo = {
    id: 0,
    video_url: "https://youtu.be/PNH0V6bvMEM",
    video_thumbnail:
      "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/banner-video-thumbnail/1736164372_Rectangle%202195.png",
  };
  const growthVideoGroup: any = (homepageGlobal as any)?.growth_video ?? {};
  const growthVideo: GrowthVideo =
    growthVideoGroup.enabled !== false &&
    (growthVideoGroup.video_url ||
      typeof growthVideoGroup.video_thumbnail === "object")
      ? {
          id: 0,
          video_url: growthVideoGroup.video_url,
          video_thumbnail:
            (typeof growthVideoGroup.video_thumbnail === "object" &&
              growthVideoGroup.video_thumbnail?.url) ||
            GROWTH_VIDEO_FALLBACK.video_thumbnail,
        }
      : GROWTH_VIDEO_FALLBACK;

  /* Latest case studies — explicit homepage picks first (already-
     expanded docs), else the rich client list from /home/client. */
  const clients: ClientCaseStudyItem[] =
    featuredCaseStudies.length > 0
      ? featuredCaseStudies
          .filter((s: any) => s && typeof s === "object")
          .map((s: any) => ({
            id: s.id,
            slug: s.slug,
            client_img: imageUrl(s),
            client_title: s.title,
            client_description: s.client_name || s.title,
          }))
      : homeClientsFallback;

  /* Assemble homeData — pure the API now. Each sub-field is
     undefined-safe so the Home view's skeleton fallbacks fire if
     a section's content isn't published yet. */
  const homeData: HomeData | null =
    mergedTopBanner || otherService.length > 0 || growthVideo || clients.length > 0
      ? {
          top_banner: mergedTopBanner,
          other_service: otherService.length > 0 ? otherService : undefined,
          video: growthVideo,
          client: clients.length > 0 ? clients : undefined,
        }
      : null;

  /* Flatten the API book-call-templates doc to the legacy
     BookCallData shape (title1/2 + description1/2 sit under
     left_column / right_column groups in the API; book_image is
     an upload that depth=1 expands into a full media doc). */
  const bookCallData: BookCallData | null = bookCallDoc
    ? {
        id: bookCallDoc.id,
        book_heading: bookCallDoc.book_heading,
        book_button_text: bookCallDoc.book_button_text,
        book_image:
          (typeof bookCallDoc.book_image === "object" &&
            bookCallDoc.book_image?.url) ||
          bookCallDoc.legacyImageUrl,
        book_title1: bookCallDoc.left_column?.book_title1,
        book_description1: bookCallDoc.left_column?.book_description1,
        book_title2: bookCallDoc.right_column?.book_title2,
        book_description2: bookCallDoc.right_column?.book_description2,
      }
    : null;

  /* Hire-us cards: the the API global stores them under
     user_choices.items[]; the view consumes a flat array of
     {user_choice_title, user_choice_description, user_choice_button_text}. */
  const hireUsItems: HireUsItem[] = Array.isArray(
    (hireUsContent as any)?.user_choices?.items,
  )
    ? (hireUsContent as any).user_choices.items.map((it: any) => ({
        user_choice_title: it.user_choice_title,
        user_choice_description: it.user_choice_description,
        user_choice_button_text: it.user_choice_button_text,
      }))
    : [];

  return {
    homeData,
    youtubeData,
    servicesByCategory,
    serviceCategories,
    bookCallData,
    hireUsItems,
    brands,
  };
}
