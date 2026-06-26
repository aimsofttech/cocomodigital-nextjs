// @ts-nocheck

/**
 * Placeholder card shown while jobs are loading — mirrors
 * <JobCard />'s structure (header + title, 4 meta chips, CTA)
 * so the grid doesn't jump in height when real cards swap in.
 */
const JobCardSkeleton = () => (
  <div className="career-page-card-main career-page-card-skeleton" aria-hidden="true">
    <div className="career-page-card-header">
      <span className="career-page-card-skeleton-block career-page-card-skeleton-category" />
      <span className="career-page-card-skeleton-block career-page-card-skeleton-title" />
    </div>

    <div className="career-page-card-meta">
      <span className="career-page-card-skeleton-block career-page-card-skeleton-chip" />
      <span className="career-page-card-skeleton-block career-page-card-skeleton-chip" />
      <span className="career-page-card-skeleton-block career-page-card-skeleton-chip" />
      <span className="career-page-card-skeleton-block career-page-card-skeleton-chip" />
    </div>

    <span className="career-page-card-skeleton-block career-page-card-skeleton-cta" />
  </div>
);

export default JobCardSkeleton;
