// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "@/src/lib/navigation";
import { adminRoutes } from "../../../lib/adminEditRoutes";
import EditPencil from "../../../components/common/EditPencil/EditPencil";
import LexicalBody from "../../../components/common/LexicalBody/LexicalBody";
import {
  FaMapMarkerAlt,
  FaUserClock,
  FaBriefcase,
  FaLaptopHouse,
  FaArrowRight,
} from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import CareerTrustStrip from "../../../components/Jobs/CareerTrustStrip/CareerTrustStrip";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  freelance: "Freelance",
  internship: "Internship",
  contract: "Contract",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  on_site: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

/* job_type / work_type / experience may be saved as a single value
   or an array of multiple selections — render either as a single,
   comma-separated string instead of letting JSX render an array's
   items back-to-back with no separator. */
const joinLabels = (
  value: string | string[] | null | undefined,
  labels?: Record<string, string>,
): string => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((v) => labels?.[v] ?? v).join(", ");
};

const JobDetails = () => {
  const { slug } = useParams();
  const [error, setError] = useState(null);
  const [jobDetails, SetJobDetails] = useState();

  // Reading-progress state — tracked separately because the bar
  // is fixed-position and visible only while the description
  // section is in view (rather than always on screen).
  const descriptionRef = useRef(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showReadingProgress, setShowReadingProgress] = useState(false);

  useEffect(() => {
    // Reset stale data immediately on slug change so navigating
    // /job/A → /job/B doesn't briefly render A's
    // hero + description while B's fetch is in flight. Same
    // pattern as Services / SingleService / SingleVideo.
    SetJobDetails(undefined);

    const fetchJobData = async () => {
      try {
        /* Phase 5l: fetch from the API jobs by slug. */
        const url = new URL("/content-api/jobs", window.location.origin);
        url.searchParams.set("where[slug][equals]", slug);
        url.searchParams.set("limit", "1");
        url.searchParams.set("depth", "1");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        SetJobDetails(body?.docs?.[0] ?? null);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch job data");
      }
    };

    if (slug) fetchJobData();
  }, [slug]);

  // Reading-progress effect — measures the description section's
  // position on every scroll. Bar visible only while the section
  // overlaps the viewport; width = % of section the user has
  // scrolled past. Passive listener + bounding-rect math is plenty
  // for this; no IntersectionObserver needed since we want a
  // continuous percentage, not a discrete state.
  useEffect(() => {
    const onScroll = () => {
      const el = descriptionRef.current;
      if (!el) {
        setShowReadingProgress(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      // Only show while the section overlaps the viewport.
      const inView = rect.top < vh && rect.bottom > 0;
      setShowReadingProgress(inView);
      if (!inView) return;

      // % of the section that's scrolled past the viewport top.
      // Clamp to [0, 100].
      const sectionHeight = rect.height;
      const denom = Math.max(1, sectionHeight - vh);
      const scrolledIn = Math.max(0, -rect.top);
      const pct = Math.max(0, Math.min(100, (scrolledIn / denom) * 100));
      setReadingProgress(pct);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // jobDetails included so the effect re-runs once the
    // description content lands and the section's height becomes
    // measurable.
  }, [jobDetails]);

  if (error) {
    return <h1 style={{ color: "red" }}>{error}</h1>;
  }

  // Render hero skeleton while jobDetails is undefined so the page
  // shell paints immediately (no full-page Loader gate). Once data
  // arrives the skeleton swaps for the real content with no layout
  // shift.
  const isLoading = jobDetails === undefined;

  // jobDetails === null after fetch means "not found" — preserved
  // existing not-found UI.
  if (jobDetails === null) {
    return (
      <div className="job-details-not-found">
        <h2>Job not found</h2>
        <Link to="/career" className="job-details-not-found-link">
          <IoArrowBack /> See all open roles
        </Link>
      </div>
    );
  }

  const applyHref = jobDetails?.slug
    ? `/job-application/${jobDetails.slug}`
    : "#";

  return (
    <>
      <div className="job-details-page-wrapper">
        {/* ----------------------------------------------------------
            Hero — sticker-language top of the page. Back button +
            (optional) category eyebrow + role title + sticker meta
            chips + prominent Apply Now CTA.
            ---------------------------------------------------------- */}
        <section className="job-details-hero">
          <div className="job-details-hero-inner">
            {/* Quiet "back to listings" link — small muted text
                at the top of the hero, not the sticker pill button
                we tried earlier (that read as unusual on a JD).
                Browsers + the header "Open Roles" CTA also cover
                this; this link is the explicit on-page path for
                users who want a clear "go back to all roles". */}
            <Link to="/career" className="job-details-back-link">
              <IoArrowBack aria-hidden="true" />
              All open roles
            </Link>

            {isLoading ? (
              <div
                className="job-details-hero-skeleton"
                aria-hidden="true"
              />
            ) : (
              <div className="job-details-hero-content">
                {jobDetails?.category_name && (
                  <p className="job-details-eyebrow">
                    {jobDetails.category_name}
                  </p>
                )}

                <h1 className="job-details-title edit-host">
                  {jobDetails?.title}
                  <EditPencil
                    to={adminRoutes.jobs.job(jobDetails?.id)}
                    label={jobDetails?.title || "this job"}
                  />
                </h1>

                {/* Meta chips + Apply CTA in the same row on desktop
                    so the hero uses the horizontal real estate
                    instead of stacking the CTA below a half-empty
                    chip line. Mobile stacks them naturally
                    (chips first, CTA below) via the responsive
                    flex rules in JobDetails.css. */}
                <div className="job-details-hero-meta-row">
                  <div className="job-details-meta-chips">
                    {jobDetails?.location && (
                      <span className="job-details-meta-chip">
                        <FaMapMarkerAlt aria-hidden="true" />
                        {jobDetails.location}
                      </span>
                    )}
                    {jobDetails?.experience && (
                      <span className="job-details-meta-chip">
                        <FaUserClock aria-hidden="true" />
                        {joinLabels(jobDetails.experience)}
                      </span>
                    )}
                    {jobDetails?.job_type && (
                      <span className="job-details-meta-chip">
                        <FaBriefcase aria-hidden="true" />
                        {joinLabels(jobDetails.job_type, JOB_TYPE_LABELS)}
                      </span>
                    )}
                    {jobDetails?.work_type && (
                      <span className="job-details-meta-chip">
                        <FaLaptopHouse aria-hidden="true" />
                        {joinLabels(jobDetails.work_type, WORK_TYPE_LABELS)}
                      </span>
                    )}
                  </div>

                  <Link to={applyHref} className="job-details-apply-cta">
                    Apply Now
                    <FaArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------
            Job description — admin authored. the API's `description`
            is a Lexical AST (object), not an HTML string. Token
            typography defaults via .job-details-description in
            JobDetails.css.
            Phase 5+ 2026-05-22: switched to shared LexicalBody so
            the Lexical AST renders properly (was rendering as
            [object Object]). Helper transparently handles legacy
            HTML strings too.
            ---------------------------------------------------------- */}
        {!isLoading && jobDetails?.description && (
          <section
            ref={descriptionRef}
            className="job-details-description-section"
          >
            <div className="job-details-description-inner">
              <LexicalBody
                data={jobDetails.description}
                className="job-details-description"
              />
            </div>
          </section>
        )}

        {/* Trust + culture strip — same component used on /career so
            candidates get the team-size + culture story consistently
            no matter which careers page they land on. */}
        <CareerTrustStrip />

        {/* ----------------------------------------------------------
            Closing Apply CTA — final ask, large sticker card. Last
            chance to convert before the user scrolls away.
            ---------------------------------------------------------- */}
        {!isLoading && (
          <section className="job-details-closer">
            <div className="job-details-closer-card">
              <h2 className="job-details-closer-heading">
                Get to know us and join our team
              </h2>
              <p className="job-details-closer-pitch">
                Ready to apply? It takes about 3 minutes — name, contact,
                experience, and a CV. Anil personally reads applications.
              </p>
              <Link to={applyHref} className="job-details-apply-cta">
                Apply Now
                <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Sticky mobile Apply bar — full-width fixed bottom on
          phones so the apply ask is always one tap away while the
          user scrolls through the JD. Hidden on desktop where the
          in-page CTAs are easily reachable. */}
      {!isLoading && (
        <Link
          to={applyHref}
          className="job-details-mobile-apply-bar"
          aria-label="Apply now for this role"
        >
          Apply Now
          <FaArrowRight aria-hidden="true" />
        </Link>
      )}

      {/* Reading progress bar — thin yellow track fixed at the
          very top of the viewport, sits above the page header
          (z 60 vs header z 50) so it's visible whichever theme
          the header is in. Mounts only while the user is mid-
          description so it doesn't decorate other sections. */}
      {showReadingProgress && (
        <div
          className="job-details-reading-progress"
          aria-hidden="true"
        >
          <div
            className="job-details-reading-progress-fill"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}
    </>
  );
};

export default JobDetails;
