// @ts-nocheck
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { TbSearch } from "react-icons/tb";
import { FaArrowRight } from "react-icons/fa";
import CustomSelect from "../../../components/common/CustomSelect/CustomSelect";
import Pagination from "../../../components/common/Pagination/Pagination";
import JobCard from "./JobCard";
import JobCardSkeleton from "./JobCardSkeleton";
import CareerTrustStrip from "../../../components/Jobs/CareerTrustStrip/CareerTrustStrip";

// Cocoma HR contact — used for "don't see your role?" speculative
// applicants. Single constant so any future swap is one line.
const CAREERS_EMAIL = "hr@cocomadigital.com";

/**
 * Career view — open roles listing.
 *
 * Phase 4 refactor: page now passes server-fetched the API data
 * as `initialJobs` / `initialJobCategories` / `initialTotal`, so
 * first paint is SSR-rendered. The filter + search + pagination
 * flows still re-fetch client-side (currently via the legacy
 * Laravel endpoint — a follow-up will swap those to the API too,
 * unblocking full Redux removal for this page).
 *
 * Backward compatible: if a caller renders <Career /> without
 * props (legacy callers), the existing client-side fetch flow
 * still runs from scratch. New behavior only applies when initial
 * props are passed.
 */
interface CareerProps {
  initialJobs?: any[];
  initialJobCategories?: any[];
  initialTotal?: number;
}

const Career = ({
  initialJobs = [],
  initialJobCategories = [],
  initialTotal = 0,
}: CareerProps) => {
  const topScrollToCards = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [resetFilters, setResetFilters] = useState(false);
  const [jobCategories, setJobCategories] = useState(initialJobCategories);
  const [jobList, setJobList] = useState(initialJobs);
  const [totalDataCount, setTotalDataCount] = useState(initialTotal);
  /* Skip the loading skeleton when we hydrated with server data. */
  const [loadingJobs, setLoadingJobs] = useState(initialJobs.length === 0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    all: "All",
    job_category: "",
    job_type: "",
    workplace_type: "",
    job_experience: "",
    job_location: "",
    limit: 30,
  });
  /* `userInteracted` gates the client-side re-fetch effect. Without
     this, the first render after hydration would immediately re-
     fetch with the default filter values and overwrite the SSR
     data — flash of replacement content. We only re-fetch once the
     user actually filters / searches / paginates. */
  const [userInteracted, setUserInteracted] = useState(false);
  const totalPages = Math.ceil(totalDataCount / filters?.limit);
  const offset = (currentPage - 1) * filters?.limit;

  // scroll to top to cards on page change
  const scrollToTopToCards = () => {
    topScrollToCards.current?.scrollIntoView({ behavior: "smooth" });
  };

  // -----Handle Data on search-----------
  const textSearchHandler = (e) => {
    setSearchText(e.target.value);
    setCurrentPage(1);
    setUserInteracted(true);
  };

  // -----get api for job categories list--------
  /* Skip if seeded with server data — saves a round trip. */
  useEffect(() => {
    if (initialJobCategories.length > 0) return;
    const fetchJobCategories = async () => {
      try {
        /* Phase 5l: the API job-categories. */
        const url = new URL("/content-api/job-categories", window.location.origin);
        url.searchParams.set("limit", "50");
        url.searchParams.set("depth", "0");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        setJobCategories(body?.docs || []);
      } catch (error) {
        console.error("Error fetching job categories:", error);
      }
    };
    fetchJobCategories();
  }, [initialJobCategories.length]);

  // -----get api for job list--------
  /* Re-fetch on filter / search / page changes. Skips the initial
     fire after SSR hydration via the `userInteracted` flag. */
  useEffect(() => {
    if (!userInteracted) return;
    const fetchJobList = async () => {
      try {
        setLoadingJobs(true);
        /* Phase 5l: the API jobs filtered by category + job_type +
           work_type + experience + location + title contains.
           Page-based pagination. Adapts to legacy
           {job_list, total_count} shape. */
        const url = new URL("/content-api/jobs", window.location.origin);
        url.searchParams.set("where[is_active][equals]", "true");
        if (filters?.job_category) {
          url.searchParams.set("where[category.slug][equals]", String(filters.job_category));
        }
        if (filters?.job_experience) {
          url.searchParams.set("where[experience][equals]", String(filters.job_experience));
        }
        if (filters?.job_type) {
          url.searchParams.set("where[job_type][equals]", String(filters.job_type));
        }
        if (filters?.workplace_type) {
          url.searchParams.set("where[work_type][equals]", String(filters.workplace_type));
        }
        if (filters?.job_location) {
          url.searchParams.set("where[location][contains]", String(filters.job_location));
        }
        if (searchText) {
          url.searchParams.set("where[title][contains]", searchText);
        }
        const limit = filters?.limit ?? 20;
        url.searchParams.set("limit", String(limit));
        url.searchParams.set(
          "page",
          String(Math.floor((offset ?? 0) / limit) + 1),
        );
        url.searchParams.set("sort", "-createdAt");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        /* Phase 5l smoke fix: card reads legacy field names
           (job_title, job_slug, job_experience, job_type,
           job_location, workplace_type, category_name). Adapt
           the API's shape so the card renders.
           Phase 5+ 2026-05-22: JobCard's `joinLabels()` expects
           array-of-`{label}` for type/workplace/location (legacy
           multi-select shape). Wrap scalar strings so chips
           render — matches the page.tsx adapter. */
        const humanise = (v: any) => {
          if (!v || typeof v !== "string") return null;
          const ov: Record<string, string> = {
            full_time: "Full Time",
            part_time: "Part Time",
            on_site: "On-Site",
          };
          return ov[v] || v.split(/[_\s]+/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
        };
        /* job_type / work_type are arrays of raw snake_case codes —
           humanise each entry. */
        const wrapEnum = (v: any) => {
          const arr = Array.isArray(v) ? v : v ? [v] : [];
          const labels = arr.map(humanise).filter(Boolean);
          return labels.length ? labels.map((label) => ({ label })) : undefined;
        };
        /* experience / location are already display-ready (content.ts
           humanises experience codes upstream) — just wrap. */
        const wrap = (v: any) => {
          const arr = Array.isArray(v) ? v : v ? [v] : [];
          return arr.length ? arr.map((label) => ({ label })) : undefined;
        };
        const adapted = (body?.docs || []).map((j: any) => ({
          id: j.id,
          job_title: j.title,
          job_slug: j.slug,
          job_experience: wrap(j.experience),
          job_type: wrapEnum(j.job_type),
          workplace_type: wrapEnum(j.work_type),
          job_location: wrap(j.location),
          category_name:
            typeof j.category === "object" ? j.category?.name : undefined,
        }));
        setJobList(adapted);
        setTotalDataCount(body?.totalDocs || 0);
      } catch (error) {
        console.error("Error fetching job data:", error);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobList();
  }, [filters, searchText, offset, userInteracted]);

  const categories = [
    {
      id: 1,
      category: "All",
      subCategory: null,
    },
    {
      id: 2,
      category: "Job Category",
      category_slug: "job_category",
      subCategory: jobCategories
    },
    {
      id: 3,
      category: "Employment Type",
      category_slug: "job_type",
      subCategory: [
        { name: "Full Time", slug: "full_time" },
        { name: "Part Time", slug: "part_time" },
        { name: "Freelance", slug: "freelance" },
        { name: "Internship", slug: "internship" },
        { name: "Contract", slug: "contract" },
      ],
    },
    {
      id: 4,
      category: "Work Type",
      category_slug: "workplace_type",
      subCategory: [
        { name: "On-Site", slug: "on_site" },
        { name: "Remote", slug: "remote" },
        { name: "Hybrid", slug: "hybrid" },
      ],
    },
    {
      id: 5,
      category: "Experience",
      category_slug: "job_experience",
      subCategory: [
        { name: "Fresher (0 Year)", slug: "0" },
        { name: "1 - 2 Years", slug: "1-2" },
        { name: "3 - 5 Years", slug: "3-5" },
        { name: "6 - 8 Years", slug: "6-8" },
        { name: "9 - 12 Years", slug: "9-12" },
        { name: "12+ Years", slug: "12-plus" }
      ],
    }
  ];

  // Handle category filter
  const handleCategorySelect = (category, subCategory) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      all: "",
      [category]: subCategory,
    }));
    setResetFilters(false);
    setUserInteracted(true);
  };

  const categoryAllClear = () => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      all: "All",
      job_category: "",
      job_type: "",
      workplace_type: "",
      job_experience: "",
      job_location: "",
    }));
    setCurrentPage(1);
    setResetFilters(true);
    setUserInteracted(true);
  };

  return (
    <div className="career-page-main-wrapper">
      {/* ----------------------------------------------------------
          Hero — sticker-language landing for the careers page.
          Brand-led headline + supporting line + a tiny inline CTA
          that scrolls to the open roles below.
          ---------------------------------------------------------- */}
      <section className="career-hero" aria-labelledby="career-hero-heading">
        <div className="career-hero-inner">
          <p className="career-hero-eyebrow">Careers at Cocoma</p>
          <h1 className="career-hero-heading" id="career-hero-heading">
            Build the future of video{" "}
            <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">with us</span>.
          </h1>
          <p className="career-hero-pitch">
            We're a 60-person creative team building for global brands across
            film, OTT, education, music and brand campaigns. If you do great
            work and want it to ship — you'll fit here.
          </p>
          <Link href="#career-open-roles" className="career-hero-cta">
            See open roles
            <FaArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Trust + culture strip — 4 sticker cards (team size,
          time in business, location, founder-led culture). */}
      <CareerTrustStrip />

      {/* ----------------------------------------------------------
          Open roles — search + filters + job cards. Existing
          API-driven flow preserved; restyled wrapper + cards.
          ---------------------------------------------------------- */}
      <section
        className="career-roles"
        id="career-open-roles"
        ref={topScrollToCards}
      >
        <div className="career-roles-inner">
          <h2 className="career-roles-heading">Open roles</h2>
          <p className="career-roles-sub">
            Filter by category, experience, work type — or search for a
            specific role.
          </p>

          <div className="career-page-content-wrapper">
            {/* search content */}
            <div className="career-page-search-wrapper mb-sm-3">
              <input
                onChange={textSearchHandler}
                type="text"
                placeholder="Search roles…"
                className="w-full"
              />
              <TbSearch className="career-page-search-icon" />
            </div>

            {/* Category Buttons */}
            <div className="career-page-btn-wrapper">
              {categories?.map((category, index) =>
                category?.category === "All" ? (
                  <button
                    onClick={categoryAllClear}
                    className={`career-page-btn font-primary ${filters?.all === "All" ? "active-dropdown" : ""
                      }`}
                    key={index}
                  >
                    {category?.category}
                  </button>
                ) : (
                  <CustomSelect
                    key={index}
                    category={category}
                    reset={resetFilters}
                    filter={filters}
                    onSelect={handleCategorySelect}
                  />
                )
              )}
            </div>

            {/* Job Listings */}
            <div className="career-page-card-main-wrapper">
              {loadingJobs &&
                Array.from({ length: 6 }, (_, index) => (
                  <JobCardSkeleton key={index} />
                ))}
              {!loadingJobs &&
                (jobList?.length > 0 ? (
                  jobList?.map((job, index) => (
                    <JobCard
                      key={index}
                      category={job?.category_name}
                      title={job?.job_title}
                      experience={job?.job_experience}
                      type={job?.job_type}
                      workplace={job?.workplace_type}
                      id={job?.id}
                      slug={job?.job_slug}
                      location={job?.job_location}
                    />
                  ))
                ) : (
                  <div className="career-page-no-data-wrapper">
                    <p className="text-center">No jobs match those filters.</p>
                  </div>
                ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  setUserInteracted(true);
                }}
                scrollToTopToCards={scrollToTopToCards}
              />
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          Closing CTA — speculative applicants. Anyone who didn't
          see the right role is invited to send their CV anyway.
          Sticker card matches the page-wide visual family.
          ---------------------------------------------------------- */}
      <section className="career-speculative" aria-labelledby="career-speculative-heading">
        <div className="career-speculative-card">
          <h2 className="career-speculative-heading" id="career-speculative-heading">
            Don't see your role?
          </h2>
          <p className="career-speculative-pitch">
            We're always open to great people. Send us your CV and a short
            note about what you're looking for — we'll find the fit.
          </p>
          <a
            href={`mailto:${CAREERS_EMAIL}?subject=Speculative%20application`}
            className="career-speculative-cta"
          >
            Email {CAREERS_EMAIL}
            <FaArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
};

export default Career;
