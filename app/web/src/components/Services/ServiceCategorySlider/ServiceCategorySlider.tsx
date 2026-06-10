// @ts-nocheck
import ServiceSlider from "../../../components/common/ServiceSlider/ServiceSlider";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";

const ServiceCategorySlider = ({ categoryName, serviceData, id, item_id}) => {

  return (
    <div className="service-page-youtube-main-wrapper">
      <div className="service-page-youtube-main mb-0">
        <h2 className="font-bold uppercase service-page-youtube-main-title font-primary">
          {categoryName}
          <EditLink
            path={`${ADMIN_URL}/home/group/service/group_service_category/show/${id}/${item_id}`} />
        </h2>
        <ServiceSlider data={serviceData} />
      </div>
    </div>
  );
};

export default ServiceCategorySlider;
