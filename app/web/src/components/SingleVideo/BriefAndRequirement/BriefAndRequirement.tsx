// @ts-nocheck
import Image from "next/image";
import { ADMIN_URL } from "../../../utils/constant";
import EditLink from "../../Edit-Link/Edit-Link";
export default function BriefAndRequirement({ RequireMentData }) {
  return (
    <div className="brief-and-requirement-main-wrapper">
      <div className="brief-and-requirement-main">
        <div className="brief-and-requirement-content">
          <div className="text-center">
            <h1 className="single-video-how-to-edit-title font-primary">
              Brief And Requirement
              <EditLink
                path={`${ADMIN_URL}/home/creative_house/creative_house_item/show/${RequireMentData?.id}`} />
            </h1>
          </div>
          <div className="brief-and-requirement-img-wrapper text-center">
            {RequireMentData?.requirement_logo && (
              <Image
                src={RequireMentData.requirement_logo}
                alt="Requirement logo"
                width={200}
                height={200}
              />
            )}
          </div>
          <div className="text-center">
            <p className="invite-for-edit-content-line">
              {RequireMentData?.requirement_description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
