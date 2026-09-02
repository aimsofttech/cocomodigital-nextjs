// @ts-nocheck
import ServiceSlider from "../../common/ServiceSlider/ServiceSlider";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";
import { adminRoutes } from "@/src/lib/adminEditRoutes";

/**
 * "Related services" cross-sell strip on /service/:slug.
 *
 * Component name is historical — despite "VideoEditingServices",
 * this is now a generic same-category cross-sell row. Heading is
 * derived from the parent service group title (e.g. "More from
 * YouTube Monetisation") so it correctly reflects the actual
 * category for whatever service the user is viewing — Content
 * Operations, Channel Management, Advertising, etc. — not the
 * hardcoded "Other Video Editing Services" copy that previously
 * landed on every page regardless of category.
 *
 * If no parent category name is passed in the heading falls back
 * to a clean generic ("More services like this") so the row is
 * never wrong.
 */
const VideoEditingServices = ({ otherServices, categoryName }) => {
  // Verb-first heading invites browsing rather than reading as a
  // dry classification label. "in {category}" makes the category
  // relationship explicit so the user understands these are
  // SAME-CATEGORY services, not random cross-sells.
  const heading = categoryName
    ? `Explore more in ${categoryName}`
    : "Explore more services";

  return (
    <div className="service-page-video-edit-service-main-wrapper">
      <div className="service-page-video-edit-service-main my-5">
        <h2 className="font-bold mb-4 service-page-video-edit-service-title font-primary edit-host">
          <EditPencil
            to={adminRoutes.groupService.item()}
            label="the related services"
          />
          {heading}
        </h2>
        <ServiceSlider data={otherServices} />
      </div>
    </div>
  );
};

export default VideoEditingServices;
