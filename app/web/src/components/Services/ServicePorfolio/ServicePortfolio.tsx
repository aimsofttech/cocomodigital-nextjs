// @ts-nocheck
"use client";
import { lazy, Suspense, useState, useMemo } from "react";
import Image from "next/image";
import PlayBtn from "../../common/PlayBtn/PlayBtn";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";

const ReactPlayer = lazy(() => import("react-player"));

/* ── Image Not Available placeholder ─────────────────────── */
const ImgPlaceholder = () => (
  <div
    style={{
      width: "100%",
      aspectRatio: "16 / 9",
      background: "#f0f0f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "8px",
      border: "2px dashed #ccc",
      color: "#888",
      fontSize: "clamp(11px, 2vw, 15px)",
      userSelect: "none",
    }}
    role="img"
    aria-label="Image not available"
  >
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
    Image Not Available
  </div>
);

/* ── Filter pill button ──────────────────────────────────── */
const FilterBtn = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: "8px 20px",
      borderRadius: "999px",
      border: "1.5px solid #111",
      backgroundColor: active ? "#111" : "#fff",
      color: active ? "#fff000" : "#111",
      fontSize: "clamp(11px, 1.3vw, 13px)",
      fontWeight: active ? 700 : 500,
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "background-color 0.2s, color 0.2s, border-color 0.2s",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      flexShrink: 0,
      fontFamily: "inherit",
      outline: "none",
    }}
    aria-pressed={active}
  >
    {label}
  </button>
);

const Portfolio = ({
  portfolioCategories,
  serviceTitle,
  initialPortfolioData = null,
}) => {
  const [playingVideoId, setPlayingVideoId] = useState(null);
  // -1 = "All" tab; ≥0 = index into portfolioCategories
  const [activeIndex, setActiveIndex] = useState(-1);

  const portfolioData = useMemo(() => {
    if (!Array.isArray(portfolioCategories) || portfolioCategories.length === 0) {
      return initialPortfolioData || [];
    }
    if (activeIndex === -1) {
      return portfolioCategories.flatMap((c, ci) =>
        (c?.items ?? []).map((it, ii) => ({
          ...it,
          id: it?.id ?? `${ci}-${ii}`,
          category_id: c?.id ?? ci,
          thumbnail: it?.image ?? it?.thumbnail,
        })),
      );
    }
    const cat = portfolioCategories[activeIndex];
    if (!cat) return [];
    return (cat?.items ?? []).map((it, ii) => ({
      ...it,
      id: it?.id ?? `${activeIndex}-${ii}`,
      category_id: cat?.id ?? activeIndex,
      thumbnail: it?.image ?? it?.thumbnail,
    }));
  }, [portfolioCategories, activeIndex, initialPortfolioData]);

  const heading = serviceTitle ? `${serviceTitle} in Action` : "Our Work";
  const hasCategories = Array.isArray(portfolioCategories) && portfolioCategories.length > 0;

  return (
    <div className="service-details-porfolio-main-wrapper">
      <div className="service-details-porfolio-main">
        <div className="marketing-creative-main">

          {/* Section heading */}
          <div style={{ marginBottom: "24px" }}>
            <h2 className="font-bold service-page-video-edit-service-title font-primary">
              {heading}
              <EditLink
                path={`${ADMIN_URL}/home/group/service/portfolio/group_single_service_portfolio_category`}
              />
            </h2>
          </div>

          {/* Filter pills */}
          {hasCategories && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "28px",
                alignItems: "center",
              }}
            >
              <FilterBtn
                label="All"
                active={activeIndex === -1}
                onClick={() => setActiveIndex(-1)}
              />
              {portfolioCategories.map((cat, idx) => (
                <FilterBtn
                  key={cat?.id ?? idx}
                  label={cat?.category_name || `Category ${idx + 1}`}
                  active={activeIndex === idx}
                  onClick={() => setActiveIndex(idx)}
                />
              ))}
            </div>
          )}

          {/* Portfolio grid */}
          {portfolioData?.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
                gap: "16px",
                width: "100%",
              }}
            >
              {portfolioData.map((video) => (
                <div
                  key={video?.id}
                  className="service-details-porfolio-video-cards"
                  style={{ position: "relative" }}
                >
                  <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden" }}>
                    {playingVideoId === video?.id ? (
                      /* Video player — 16:9 ratio matches standard video */
                      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                        <Suspense
                          fallback={
                            <div style={{ position: "absolute", inset: 0, background: "#000" }} />
                          }
                        >
                          <ReactPlayer
                            url={video?.video_url}
                            controls
                            playing={true}
                            width="100%"
                            height="100%"
                            style={{ position: "absolute", top: 0, left: 0 }}
                          />
                        </Suspense>
                      </div>
                    ) : (
                      /* Thumbnail — natural image ratio, no cropping */
                      <div
                        onClick={() => video?.video_url ? setPlayingVideoId(video?.id) : undefined}
                        style={{
                          cursor: video?.video_url ? "pointer" : "default",
                          position: "relative",
                          lineHeight: 0,
                        }}
                      >
                        {video?.thumbnail ? (
                          <>
                            <Image
                              src={video.thumbnail}
                              alt={video?.title || "Portfolio item"}
                              width={600}
                              height={400}
                              style={{ width: "100%", height: "auto", display: "block" }}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            {video?.video_url && <PlayBtn />}
                          </>
                        ) : (
                          <ImgPlaceholder />
                        )}
                      </div>
                    )}

                    <div style={{ position: "absolute", top: 4, right: 8, zIndex: 10 }}>
                      <EditLink
                        path={`${ADMIN_URL}/home/roup/service/portfolio/group_single_service_portfolio_item/show/${video?.id}/${video?.category_id}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                padding: "48px 0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#999",
                fontSize: "15px",
              }}
            >
              No items in this category
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Portfolio;
