// @ts-nocheck
import { useEffect, useState } from "react";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";

export default function CampaignObjectives({ itemData }) {
  const [campaign, setCampaign] = useState([]);

  useEffect(() => {
    /* Phase 5l+ 2026-05-22: legacy backend exposed six flat scalars
       client_requirement_1..6. The new the API schema stores them as
       a single `client_requirements` array of {text}. Accept either
       shape so legacy data and the API-edited data both render. */
    let campaignArray: string[] = [];
    if (Array.isArray(itemData?.client_requirements) && itemData.client_requirements.length) {
      campaignArray = itemData.client_requirements
        .map((r: any) => (typeof r === "string" ? r : r?.text || ""))
        .filter((v: string) => v && v.trim() !== "");
    } else {
      campaignArray = Object.keys(itemData)
        .filter((key) => /^client_requirement_[1-6]$/.test(key))
        .map((key) => itemData[key])
        .filter((value) => value && value.trim() !== "");
    }
    setCampaign(campaignArray);
  }, [itemData]);

  return (
    <section className="campaign-section">
      <div className="campaign-container">
        <h2 className="campaign-title font-primary edit-host">
          Client Goals
          <EditPencil
            to={adminRoutes.marketing.item(itemData?.id)}
            label="the client goals"
          />
        </h2>
        <p className="campaign-description">
          {itemData?.client_requirement_text}
        </p>

        {/* New responsive card layout */}
        <div className="campaign-card-grid">
          {campaign?.map((item, index) => (
            <div className="campaign-card" key={index}>
              <div className="campaign-card-header">
                <div className="campaign-card-number">{index + 1}</div>
                <h3 className="campaign-card-title">
                  {item}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
