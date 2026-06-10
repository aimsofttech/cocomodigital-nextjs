// @ts-nocheck
/**
 * Gallery photo data — single source of truth for both:
 *   /about-us  ← "Cocoma in the wild" preview (featured: true only)
 *   /gallery   ← full chronological feed (all photos)
 *
 * ──────────────────────────────────────────────────────────────────────
 * MONTHLY ADD WORKFLOW (~5 minutes per batch)
 * ──────────────────────────────────────────────────────────────────────
 *   1. Save photos to /public/Images/about/<YYYY-MM>/<short-name>.jpg
 *      e.g., /public/Images/about/2026-06/holi-design-wing.jpg
 *
 *   2. Add an entry to the TOP of the GALLERY_PHOTOS array below
 *      (newest first — so a fresh batch goes immediately above the
 *      previous month's batch).
 *
 *   3. For each photo, set `featured: true` if it should appear on
 *      /about-us "Cocoma in the wild" preview. Keep ~5-10 featured
 *      total so the preview stays a tight highlight reel. ALL photos
 *      (featured or not) appear on the dedicated /gallery page.
 *
 *   4. Save the file. Site updates on next dev refresh / next build.
 *
 * ──────────────────────────────────────────────────────────────────────
 * CATEGORIES — use one or more from this list (drives /gallery filters)
 * ──────────────────────────────────────────────────────────────────────
 *   "festival"      team celebrations — Holi, Diwali, Eid, Christmas, etc.
 *   "team"          portraits, candids of the Cocoma team
 *   "studio"        studio interiors — edit bays, design rooms, lounge
 *   "client-visit"  partners visiting the Mumbai studio
 *   "on-set"        production shoots, on-location work, set days
 *   "behind-scenes" general BTS that doesn't fit cleanly above
 *
 * Stick to this set so the /gallery filter chips don't explode. Add
 * a new category here only when there are 3+ photos that justify it.
 *
 * ──────────────────────────────────────────────────────────────────────
 * PHOTO OBJECT SHAPE
 * ──────────────────────────────────────────────────────────────────────
 *   src        absolute path under /public, e.g. "/Images/about/foo.jpg"
 *   caption    one short line in Cocoma voice (shown under the photo)
 *   categories array of category strings from the list above
 *   date       "YYYY-MM" — used for sorting + monthly grouping on /gallery
 *   featured   true | false — show on /about-us preview?
 */

export const GALLERY_PHOTOS = [
  // ──────────────────────── 2026-05 (studio-life batch — 37 photos) ────────────────────────
  // Bulk-added May 2026. Captions are varied placeholders Anil can
  // refine over time; categories default to mix of team/studio/
  // behind-scenes. Photos 01, 10, 20, 30, team-day have caption
  // specifics from a quick peek (strategy session, edit bay,
  // IMDb session, team gathering, team day-out respectively).
  {
    src: "/Images/about/studio-2026-01.jpg",
    caption: "Strategy session — laptops, whiteboard, ideas in flight.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-02.jpg",
    caption: "Studio life — mid-week.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-03.jpg",
    caption: "Team at work.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-04.jpg",
    caption: "Daily flow at the studio.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-05.jpg",
    caption: "Working session.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-06.jpg",
    caption: "The crew, mid-day.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-07.jpg",
    caption: "Team huddle.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-08.jpg",
    caption: "Edit bay activity.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-09.jpg",
    caption: "Quiet focus.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-10.jpg",
    caption: "Edit bay — researching the next cut.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-11.jpg",
    caption: "Mid-flow.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-12.jpg",
    caption: "Studio team.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-13.jpg",
    caption: "Working day.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-14.jpg",
    caption: "Daily grind, the good kind.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-15.jpg",
    caption: "Team session.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-16.jpg",
    caption: "Studio moment.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-17.jpg",
    caption: "Cocoma at work.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-18.jpg",
    caption: "Daily flow.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-19.jpg",
    caption: "Team huddle, mid-week.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-20.jpg",
    caption: "IMDb work session — team gathered.",
    categories: ["team", "client-visit"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-21.jpg",
    caption: "Strategy room.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-22.jpg",
    caption: "Working hours.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-23.jpg",
    caption: "Team focus.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-24.jpg",
    caption: "Studio life.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-25.jpg",
    caption: "The crew.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-27.jpg",
    caption: "Edit bay session.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-28.jpg",
    caption: "Team at work.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-29.jpg",
    caption: "Studio activity.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-30.jpg",
    caption: "Team gathering — late-night vibes.",
    categories: ["team", "behind-scenes"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-31.jpg",
    caption: "Quiet focus.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-32.jpg",
    caption: "Working session.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-33.jpg",
    caption: "Team flow.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-34.jpg",
    caption: "Studio crew.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-35.jpg",
    caption: "Team moment.",
    categories: ["team", "behind-scenes"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-36.jpg",
    caption: "Daily focus.",
    categories: ["studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-37.jpg",
    caption: "Cocoma team in action.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/studio-2026-team-day.jpeg",
    caption: "Team day — the whole crew, off the floor.",
    categories: ["team", "behind-scenes"],
    date: "2026-05",
    featured: false,
  },

  // ──────────────────────── 2026-05 (team portraits — earlier batch) ────────────────────────
  {
    src: "/Images/about/team-youtube.jpg",
    caption: "The YouTube team — channel ops crew.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/team-social-media.jpg",
    caption: "Social media team — every platform's somebody's expertise.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/team-video-editing.jpg",
    caption: "Video editing crew — 30 specialists, mid-flow.",
    categories: ["team", "studio"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/team-marketing.jpg",
    caption: "Marketing team — running campaigns end to end.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/team-business.jpg",
    caption: "Business team — keeping the studio running.",
    categories: ["team"],
    date: "2026-05",
    featured: false,
  },
  {
    src: "/Images/about/team-outdoor.jpg",
    caption: "Team day out — away from the screens.",
    categories: ["team", "behind-scenes"],
    date: "2026-05",
    featured: false,
  },

  // ──────────────────────── 2026-04 (initial 5) ────────────────────────
  {
    src: "/Images/about/studio-visitors-international.jpg",
    caption: "International partners visiting Mumbai.",
    categories: ["client-visit"],
    date: "2026-04",
    featured: true,
  },
  {
    src: "/Images/about/studio-on-set.jpg",
    caption: "On set — our team running production.",
    categories: ["on-set"],
    date: "2026-04",
    featured: true,
  },
  {
    src: "/Images/about/studio-team-portrait.jpg",
    caption: "Some of the people who make Cocoma.",
    categories: ["team"],
    date: "2026-04",
    featured: true,
  },
  {
    src: "/Images/about/studio-edit-bay.jpg",
    caption: "Edit bay, mid-flow.",
    categories: ["studio"],
    date: "2026-04",
    featured: true,
  },
  {
    src: "/Images/about/studio-team-candid.jpg",
    caption: "Studio life. Mid-week. Mid-laugh.",
    categories: ["team", "studio"],
    date: "2026-04",
    featured: true,
  },

  // ──────────────────────── Add new months above this line ────────────────────────
];

/**
 * Returns photos with featured: true, in array order (which is
 * newest-first if entries are added at the top per the workflow above).
 * Consumed by the /about-us "Cocoma in the wild" preview section.
 */
export const getFeaturedPhotos = () =>
  GALLERY_PHOTOS.filter((p) => p.featured);

/**
 * Returns all photos grouped by month, newest month first. Each
 * group is { month: "YYYY-MM", photos: [...] }. Used by /gallery to
 * render month dividers + photo grids.
 */
export const getPhotosByMonth = () => {
  const groups = {};
  for (const photo of GALLERY_PHOTOS) {
    if (!groups[photo.date]) groups[photo.date] = [];
    groups[photo.date].push(photo);
  }
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a)) // newest month first
    .map((month) => ({ month, photos: groups[month] }));
};

/**
 * Human-readable month label from "YYYY-MM" → "April 2026".
 */
export const formatMonthLabel = (yyyymm) => {
  const [year, month] = yyyymm.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const m = parseInt(month, 10);
  if (Number.isNaN(m) || m < 1 || m > 12) return yyyymm;
  return `${monthNames[m - 1]} ${year}`;
};
