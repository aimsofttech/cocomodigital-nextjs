// @ts-nocheck
import Image from "next/image";
import { adminRoutes } from "../../../lib/adminEditRoutes";
import EditPencil from "../../common/EditPencil/EditPencil";
export default function BriefAndRequirement({ RequireMentData }) {
  return (
    <div className="brief-and-requirement-main-wrapper">
      <div className="brief-and-requirement-main">
        <div className="brief-and-requirement-content">
          <div className="text-center">
            <h1 className="single-video-how-to-edit-title font-primary edit-host">
              Brief And Requirement
              <EditPencil
                to={adminRoutes.creative.item(RequireMentData?.id)}
                label="the brief and requirement"
              />
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
              {RequireMentData?.requirementDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
