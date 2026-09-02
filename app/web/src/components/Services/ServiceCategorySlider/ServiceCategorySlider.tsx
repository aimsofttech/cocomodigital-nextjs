// @ts-nocheck
import ServiceSlider from "../../../components/common/ServiceSlider/ServiceSlider";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";

const ServiceCategorySlider = ({ categoryName, serviceData, id, item_id}) => {

  return (
    <div className="service-page-youtube-main-wrapper">
      <div className="service-page-youtube-main mb-0">
        <h2 className="font-bold uppercase service-page-youtube-main-title font-primary edit-host">
          {categoryName}
          <EditPencil
            to={adminRoutes.groupService.category(id)}
            label={categoryName || "this category"}
          />
        </h2>
        <ServiceSlider data={serviceData} />
      </div>
    </div>
  );
};

export default ServiceCategorySlider;
