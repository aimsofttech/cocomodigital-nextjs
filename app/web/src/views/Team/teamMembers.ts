// @ts-nocheck
/**
 * Team member data — single source of truth for both:
 *   /about-us  ← "60 people. All in-house. All here." preview
 *                (featured: true subset)
 *   /team      ← full team grid (everyone)
 *
 * ──────────────────────────────────────────────────────────────────────
 * ADDING A NEW TEAM MEMBER
 * ──────────────────────────────────────────────────────────────────────
 *   1. Save photo to /public/Images/about/team/<first-last>.jpg
 *      (square crop, ~1000x1000px, on Cocoma yellow background per the
 *       house style — black-and-white portrait + #fff000 background)
 *
 *   2. Add an entry below. Stable `id` (e.g., "first-last") + clean
 *      `name`, `role`, `dept`. Set `consent: true` ONLY if the person
 *      has agreed to be publicly named with their photo on the site.
 *
 *   3. Set `featured: true` to show them on the /about-us preview
 *      (curate ~4-6 leads here). All members appear on /team
 *      regardless of featured flag.
 *
 *   4. Save → both surfaces update on next refresh.
 *
 * ──────────────────────────────────────────────────────────────────────
 * CONSENT MODE — privacy-respecting fallback
 * ──────────────────────────────────────────────────────────────────────
 *   consent: true   → render full photo + real name + role + dept
 *   consent: false  → render initials avatar + role + dept ONLY
 *                     (no name, no photo) — same shape as the legacy
 *                     anonymized team cards. Use this for members who
 *                     haven't yet OK'd public publication. Flip to
 *                     true when they confirm.
 *
 * ──────────────────────────────────────────────────────────────────────
 * DEPARTMENTS — drives /team filter chips when count grows
 * ──────────────────────────────────────────────────────────────────────
 *   "Video Editing" / "Motion / Design" / "Design" /
 *   "Marketing / Creative" / "HR / Operations" /
 *   "Leadership" / "Studio / Ops" / "Channel Management"
 *   Stick to the set so filter UI doesn't sprawl. Add new dept
 *   only when 2+ members justify it. "Channel Management" added
 *   for Abhishek (YouTube Lead) + Vikas (YouTube Revenue Lead).
 */

export const TEAM_MEMBERS = [
  // ──────── Department leads (Stage 1, May 2026) ────────
  // Display order is the array order — reorder these blocks to
  // change the team grid sequence on /about-us + /team.
  {
    id: "vishal-kacker",
    name: "Vishal Kacker",
    initials: "VK",
    role: "HR & Compliance",
    dept: "HR / Operations",
    photo: "/Images/about/team/vishal-kacker.jpg",
    consent: true,
    featured: true,
  },
  {
    id: "deb-mahato",
    name: "Deb Mahato",
    initials: "DM",
    role: "Visual Promotion Lead",
    dept: "Marketing / Creative",
    photo: "/Images/about/team/deb-mahato.jpg",
    consent: true,
    featured: true,
  },
  {
    id: "ravi-mandaliya",
    name: "Ravi Mandaliya",
    initials: "RM",
    role: "Sr. Video Editor",
    dept: "Video Editing",
    photo: "/Images/about/team/ravi-mandaliya.jpg",
    consent: true,
    featured: true,
  },
  {
    id: "chirag-maru",
    name: "Chirag Maru",
    initials: "CM",
    role: "Video Editing Lead",
    dept: "Video Editing",
    photo: "/Images/about/team/chirag-maru.jpg",
    consent: true,
    featured: true,
  },
  {
    id: "sakshi-nandanwar",
    name: "Sakshi Nandanwar",
    initials: "SN",
    role: "Motion Graphics Lead",
    dept: "Motion / Design",
    photo: "/Images/about/team/sakshi-nandanwar.jpg",
    consent: true,
    featured: true,
  },
  {
    /* Spelling refined Samiksa → Samiksha when the new portrait
       landed (May 7, 2026). Photo file + id updated to match.
       If the original was actually correct (Samiksa, no 'h'),
       just flip name + photo path back — id can stay either way. */
    id: "samiksha-pandav",
    name: "Samiksha Pandav",
    initials: "SP",
    role: "Design Lead",
    dept: "Design",
    photo: "/Images/about/team/samiksha-pandav.jpg",
    consent: true,
    featured: true,
  },

  // ──────── Stage 2 (May 7-8, 2026) — Abhishek + marketing/YouTube ────────
  // Photos saved this session, entries inferred from filename role
  // suffixes. featured: false on all of these so the /about-us
  // preview stays a 6-card curated highlight (the leads from Stage 1).
  // Anil to refine roles/depts/order in a follow-up edit if any guess
  // is off — see commit message for the full guess list.
  {
    id: "abhishek-shetty",
    name: "Abhishek Shetty",
    initials: "AS",
    role: "YouTube Lead",
    dept: "Channel Management",
    photo: "/Images/about/team/abhishek-shetty.jpg",
    consent: true,
    featured: false,
  },
  {
    /* Filename suffix was "YouTube Reveneu" (typo). Going with
       "YouTube Revenue Lead" — happy to soften to "YouTube
       Monetization" if Anil prefers the Cocoma-internal vocab. */
    id: "vikas-jha",
    name: "Vikas Jha",
    initials: "VJ",
    role: "YouTube Revenue Lead",
    dept: "Channel Management",
    photo: "/Images/about/team/vikas-jha.jpg",
    consent: true,
    featured: false,
  },
  {
    /* No surname in the saved filename. Using single-name display
       until Anil confirms full name. Initials field set to "M" but
       it doesn't render anyway when consent: true. */
    id: "manish",
    name: "Manish",
    initials: "M",
    role: "Thumbnail Artist",
    dept: "Design",
    photo: "/Images/about/team/manish.jpg",
    consent: true,
    featured: false,
  },
  {
    id: "himani-jain",
    name: "Himani Jain",
    initials: "HJ",
    role: "Social Media",
    dept: "Marketing / Creative",
    photo: "/Images/about/team/himani-jain.jpg",
    consent: true,
    featured: false,
  },
  {
    id: "pratiksha-pandey",
    name: "Pratiksha Pandey",
    initials: "PP",
    role: "Social Media Content",
    dept: "Marketing / Creative",
    photo: "/Images/about/team/pratiksha-pandey.jpg",
    consent: true,
    featured: false,
  },
];

/**
 * Featured members — used by the /about-us "60 people..." preview.
 * Returns array order, which is the curated display order.
 */
export const getFeaturedMembers = () =>
  TEAM_MEMBERS.filter((m) => m.featured);

/**
 * All members — used by the /team page. Returns the full list.
 */
export const getAllMembers = () => TEAM_MEMBERS;

/**
 * Members grouped by department, alphabetical within each group.
 * Used by /team for the dept-divider layout when category counts justify.
 */
export const getMembersByDepartment = () => {
  const groups = {};
  for (const member of TEAM_MEMBERS) {
    const dept = member.dept || "Other";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(member);
  }
  return Object.keys(groups)
    .sort()
    .map((dept) => ({
      dept,
      members: groups[dept].sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id)
      ),
    }));
};
