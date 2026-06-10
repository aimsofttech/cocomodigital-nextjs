// NO "use client"

import Link from "next/link";
import type { IconType } from "react-icons";
import {
  FaPlay,
  FaBuilding,
  FaMusic,
  FaFilm,
  FaMicrophone,
  FaShoppingBag,
  FaHome,
  FaGraduationCap,
  FaGlobe,
  FaUsers,
  FaRocket,
  FaStar,
  FaLightbulb,
} from "react-icons/fa";

import { getSolutionsPages } from "@/src/lib/content";

const FALLBACK_ICONS: Record<string, IconType> = {
  "youtube-creators": FaPlay,
  "ott-platforms": FaBuilding,
  "music-labels": FaMusic,
  "film-studios": FaFilm,
  podcasters: FaMicrophone,
  "d2c-brands": FaShoppingBag,
  "real-estate-brands": FaHome,
  "educational-hubs": FaGraduationCap,
  "international-agencies": FaGlobe,
  "independent-artists": FaUsers,
};

const DEFAULT_ICONS: IconType[] = [
  FaRocket,
  FaStar,
  FaLightbulb,
];

const pickIcon = (slug: string, index: number): IconType =>
  FALLBACK_ICONS[slug] ||
  DEFAULT_ICONS[index % DEFAULT_ICONS.length];

const audienceCopyFor = (doc: any) => {
  return (
    doc?.hero?.badgeLine ||
    doc?.hero?.subheadline ||
    doc?.meta_description ||
    doc?.desc ||
    "Cocoma's playbook for your shape."
  );
};

const LEGACY_AUDIENCES = [
  {
    slug: "youtube-creators",
    title: "YouTube creators",
    desc: "Stop running your channel alone. Our 60-person team becomes your back office.",
  },
  {
    slug: "ott-platforms",
    title: "OTT platforms",
    desc: "Promo cuts, dubbed trailers, regional drops — the whole launch engine, run by us.",
  },
  {
    slug: "music-labels",
    title: "Music labels",
    desc: "Turn your back catalogue into a YouTube revenue engine. Lyrics, shorts, sync deals.",
  },
  {
    slug: "film-studios",
    title: "Film studios",
    desc: "Set-to-trailer, day-of education, post-release retention. We run the full lifecycle.",
  },
  {
    slug: "podcasters",
    title: "Podcasters",
    desc: "Pull the clips, post the shorts, grow the YouTube channel — without you touching it.",
  },
  {
    slug: "d2c-brands",
    title: "D2C brands",
    desc: "Performance creative + organic growth + shoppable content on one engine.",
  },
  {
    slug: "real-estate-brands",
    title: "Real-estate brands",
    desc: "Property video, neighbourhood storytelling, lead-gen creative at studio scale.",
  },
  {
    slug: "educational-hubs",
    title: "Educational hubs",
    desc: "Course videos, edu shorts, channel growth for ed-tech platforms + universities.",
  },
  {
    slug: "international-agencies",
    title: "International agencies",
    desc: "White-label production + coordination for agencies serving global brands.",
  },
  {
    slug: "independent-artists",
    title: "Independent artists",
    desc: "Music videos, YouTube channel, social drops — the full creative marketing stack.",
  },
];

export default async function AudienceSolutionsGrid() {
  let docs: any[] = [];

  try {
    const result = await getSolutionsPages({
      limit: 50,
      depth: 0,
    });

    docs = (result?.docs || []).filter(
      (d: any) => d?.slug && d?.title
    );
  } catch (error) {
    console.error(error);
  }

  if (docs.length === 0) {
    docs = LEGACY_AUDIENCES;
  }

  return (
    <div className="home-industries-serve-main-wrapper">
      <div className="home-industries-serve-main">
        <h3 className="home-industries-serve-title font-primary">
          Who we build for
        </h3>

        <p className="home-industries-serve-subtitle">
          {docs.length} audiences. {docs.length} playbooks.
        </p>

        <div className="industries-grid">
          {docs.map((doc: any, i: number) => {
            const Icon = pickIcon(doc.slug, i);

            return (
              <Link
                key={doc.slug}
                href={`/solutions/${doc.slug}`}
                className="industry-card"
                aria-label={`Cocoma solution for ${doc.title}`}
              >
                <span
                  className="industry-card-icon"
                  aria-hidden="true"
                >
                  <Icon />
                </span>

                <h4>{doc.title}</h4>

                <p>{audienceCopyFor(doc)}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}