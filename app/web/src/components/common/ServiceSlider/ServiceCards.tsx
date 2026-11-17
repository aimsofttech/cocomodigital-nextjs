// @ts-nocheck
"use client";
import { useCallback } from "react";
import Image from "next/image";
import { useNavigate } from "@/src/lib/navigation";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";

const getPlainText = (value) => {
  if (!value) return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const ServiceCards = ({ data }) => {
  const navigate = useNavigate();
  const description = getPlainText(
    data?.description || data?.featured_description || data?.description
  );

  const serviceDetailsPageRedirect = useCallback((slug) => {
    navigate(`/service/${slug}`)
  }, [navigate]);

  return (
    <div
      className="service-cards-main rounded-lg shadow-md"
      onClick={() => serviceDetailsPageRedirect(data?.slug)}
    >
      <>
        <div className="service-cards-img-wrapper">
          {data?.thumbnail ? (
            <Image
              src={data.thumbnail}
              alt={data?.title || "Service Image"}
              className="w-full h-40 object-cover"
              width={600}
              height={160}
              style={{ width: "100%", height: "auto" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                aspectRatio: "3 / 2",
                background: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "6px",
                border: "2px dashed #ccc",
                borderRadius: "6px",
                color: "#888",
                fontSize: "clamp(10px, 1.5vw, 13px)",
                userSelect: "none",
              }}
              role="img"
              aria-label="Image not available"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              Image Not Available
            </div>
          )}
        </div>
        <div className="service-cards-content-wrapper">
          <h3
            className="service-cards-content-title font-primary">
            {data?.title}
          </h3>
          <p
            className={`service-cards-content-description`}
          >
            {description}
          </p>
          <div className="add-explore-btn-wrapper">
            <button
              className={`w-full service-cards-content-explore-btn`}>
              Explore More
            </button>
          </div>
        </div>
      </>
      <span
        className="absolute top-0 right-0 mt-2 mr-2 pb-1 pe-1 flex justify-center content-center"
        style={{ backgroundColor: "white" }}
      >
        <EditPencil
          bare
          to={adminRoutes.groupService.item(data?.id)}
          label={data?.title || "this service"}
        />
      </span>
    </div>
  );
};


export default ServiceCards;
