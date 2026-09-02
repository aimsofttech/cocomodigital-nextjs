// @ts-nocheck
import { Link } from "@/src/lib/navigation";
import {
  FaMapMarkerAlt,
  FaUserClock,
  FaBriefcase,
  FaLaptopHouse,
  FaArrowRight,
} from "react-icons/fa";
import EditPencil from "../../../components/common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";

/**
 * <JobCard /> on /career
 *
 * One chip per field (location, experience, job type, work type),
 * icon inside the chip. When a field has multiple selected values
 * (admin multi-select), they're joined with " / " inside that one
 * chip rather than rendered as separate chips — keeps same-category
 * data visually grouped instead of bleeding into a flat row of
 * individual value chips. Always shows every value in full (no
 * capping/truncation/"+N more").
 */

/** Join an array of {label} entries into a single " / "-separated
 *  string. Returns null if the array is empty/missing so the
 *  caller can suppress the chip entirely. */
const joinLabels = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr
    .map((item) => item?.label)
    .filter(Boolean)
    .join(" / ");
};

const JobCard = ({
  title,
  experience,
  type,
  workplace,
  id,
  slug,
  category,
  location,
}) => {
  const locationLabel = joinLabels(location);
  const experienceLabel = joinLabels(experience);
  const typeLabel = joinLabels(type);
  const workplaceLabel = joinLabels(workplace);

  return (
    <Link to={`/job/${slug}`} className="career-page-card-main">
      <div className="career-page-card-header">
        {category && (
          <span className="career-page-card-category">{category}</span>
        )}
        <h3 className="career-page-card-title font-primary">{title}</h3>
      </div>

      {/* One chip per field, icon inside. Multi-select values join
          with " / " inside the same chip instead of spawning a
          separate chip per value. */}
      <div className="career-page-card-meta">
        {locationLabel && (
          <span className="career-page-card-meta-chip">
            <FaMapMarkerAlt aria-hidden="true" />
            {locationLabel}
          </span>
        )}
        {experienceLabel && (
          <span className="career-page-card-meta-chip">
            <FaUserClock aria-hidden="true" />
            {experienceLabel}
          </span>
        )}
        {typeLabel && (
          <span className="career-page-card-meta-chip">
            <FaBriefcase aria-hidden="true" />
            {typeLabel}
          </span>
        )}
        {workplaceLabel && (
          <span className="career-page-card-meta-chip">
            <FaLaptopHouse aria-hidden="true" />
            {workplaceLabel}
          </span>
        )}
      </div>

      {/* Read More — small text + arrow at bottom-right. The whole
          card is the link target so this is a visual affordance,
          not a separate clickable. Arrow nudges right on card
          hover. */}
      <div className="career-page-card-cta">
        Read More
        <FaArrowRight
          className="career-page-card-cta-icon"
          aria-hidden="true"
        />
      </div>

      <div
        className="career-page-card-edit"
        onClick={(e) => e.stopPropagation()}
      >
        <EditPencil bare to={adminRoutes.jobs.job(id)} label={title || "this job"} />
      </div>
    </Link>
  );
};

export default JobCard;
