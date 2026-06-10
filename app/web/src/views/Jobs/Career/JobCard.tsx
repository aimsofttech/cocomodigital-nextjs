// @ts-nocheck
import { Link } from "@/src/lib/navigation";
import {
  FaMapMarkerAlt,
  FaUserClock,
  FaBriefcase,
  FaLaptopHouse,
  FaArrowRight,
} from "react-icons/fa";
import EditLink from "../../../components/Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";

/**
 * <JobCard /> on /career
 *
 * Simplified from the earlier "labelled 2×2 meta grid" layout.
 * Showing Experience / Employment Type / Location / Work Type
 * each with an UPPERCASE label + value chip stacked vertically
 * meant every card had ~4 separate label blocks, each with 1-3
 * yellow chips inside — and a 3-column grid of those cards on
 * desktop showed 24+ yellow chips at once. Read as messy.
 *
 * New layout puts all meta into ONE horizontal row of outline
 * chips with inline icons, drops the redundant labels (the icon
 * conveys what the chip is), and pulls yellow back to just the
 * card-level accent (top strip + offset shadow). Cleaner scan,
 * same information.
 *
 * Multi-select handling (Anshu QA #10): admin recently enabled
 * multi-select on Job Type AND Work Type, so a single role can
 * carry "Freelance + Internship + Part Time" + "On-Site +
 * Remote + Hybrid". Rendering one chip per value made the
 * matching card balloon to 9 chips while peer cards stayed at
 * 4 — broke the row's visual rhythm.
 *
 * Fix: group each multi-select array into a single chip whose
 * label is the values joined by " / ". Chip count stays a
 * stable max of 4 (location · experience · type · workplace)
 * regardless of how many options admin selected per field. Long
 * combined labels wrap to a second line inside the chip via
 * .career-page-card-meta-chip CSS rather than spilling into
 * additional chips.
 */

/** Join an array of {label} entries into a single readable
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

      {/* Single horizontal row of meta chips. Each chip is an icon
          + value pair — replaces the previous 4-block labelled
          grid. Multi-select arrays collapse to one chip with
          " / "-joined values, so chip count stays consistent at
          ≤4 regardless of how many admin-side options are picked. */}
      <div className="career-page-card-meta">
        {locationLabel && (
          <span className="career-page-card-meta-chip">
            <FaMapMarkerAlt aria-hidden="true" />
            {locationLabel}
          </span>
        )}
        {experience && (
          <span className="career-page-card-meta-chip">
            <FaUserClock aria-hidden="true" />
            {`${experience} Years`}
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
        <EditLink path={`${ADMIN_URL}/job_list/show/${id}`} />
      </div>
    </Link>
  );
};

export default JobCard;
