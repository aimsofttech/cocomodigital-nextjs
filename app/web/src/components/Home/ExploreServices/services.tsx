// @ts-nocheck
"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GoArrowUpRight } from "react-icons/go";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";
import type { ServiceItem, ServiceCategory } from "../../../lib/homeServerFetch";

const CATEGORY_TAGLINES = {
  Content: "Scripts, edits, thumbnails that stop the scroll.",
  Growth: "Strategy and advertising that compounds.",
  Monetisation: "Turn views into revenue streams.",
  Monetization: "Turn views into revenue streams.",
  Management: "Channel ops that protect and scale your IP.",
};

interface ExploreOurServicesProps {
  serviceCategories: ServiceCategory[];
  servicesByCategory: Record<number, ServiceItem[]>;
}

export default function ExploreOurServices({
  serviceCategories,
  servicesByCategory,
}: ExploreOurServicesProps) {
  /* Phase 5+ fix 2026-05-22: pre-filter to only categories that
     actually have services. The earlier render path called .map()
     on the full list and returned null for empties — but the
     `index` argument still counted those skipped slots, so the
     visible cards displayed indices like 02 / 04 / 06 / 11 instead
     of 01 / 02 / 03 / 04. By filtering up front, `index + 1`
     becomes the correct visible position. */
  const filterCategory = (serviceCategories || []).filter(
    (cat) => (servicesByCategory[cat.id] || []).length > 0,
  );

  const [showFloatingTitle, setShowFloatingTitle] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [imgErrors, setImgErrors] = useState({});
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const categorySectionRefs = useRef({});

  useEffect(() => {
    const onScroll = () => {
      const titleEl = titleRef.current;
      const sectionEl = sectionRef.current;
      if (!titleEl || !sectionEl) return;
      const titleRect = titleEl.getBoundingClientRect();
      const sectionRect = sectionEl.getBoundingClientRect();
      const headerOffset = window.innerWidth >= 1024 ? 72 : 68;
      const pastTitle = titleRect.bottom < headerOffset;
      const beforeSectionEnd = sectionRect.bottom > headerOffset + 40;
      setShowFloatingTitle(pastTitle && beforeSectionEnd);

      const threshold = headerOffset + 120;
      let currentId = null;
      for (const cat of filterCategory) {
        const el = categorySectionRefs.current[cat.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          currentId = cat.id;
        }
      }
      if (!currentId && filterCategory.length > 0) {
        currentId = filterCategory[0].id;
      }
      setActiveCategoryId((prev) => (prev === currentId ? prev : currentId));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory?.length]);

  const activeIndex = filterCategory?.findIndex(
    (c) => c.id === activeCategoryId
  );
  const activeCategory =
    activeIndex >= 0 ? filterCategory[activeIndex] : filterCategory?.[0];
  const activeNumber =
    activeIndex >= 0
      ? String(activeIndex + 1).padStart(2, "0")
      : "01";

  return (
    <div className="service-main-wrapper" ref={sectionRef}>
      <div
        className={`service-floating-title ${showFloatingTitle ? "is-visible" : ""}`}
        aria-hidden={!showFloatingTitle}
      >
        <div className="service-floating-title-inner">
          <span className="service-floating-title-chip" aria-hidden="true">
            {activeNumber}
          </span>
          <span
            className="service-floating-title-text"
            key={activeCategoryId || "default"}
          >
            YouTube{" "}
            <span className="service-floating-title-category">
              {activeCategory?.category_name || "Growth"}
            </span>{" "}
            Services
          </span>
        </div>
      </div>
      <div className="service-main">
        <div className="marketing-creative-main">
          <div
            className="marketing-creative-title-subtitle-all-wrapper"
            ref={titleRef}
          >
            <div className="service-marketing-creative-title-subtitle-wrapper">
              <h2 className="font-bold service-marketing-creative-subtitle font-primary">
                YouTube Growth Services
                <EditLink
                  path={`${ADMIN_URL}/home/service/service_category`}
                />
              </h2>
            </div>
          </div>

          <div className="services-all-categories-wrapper">
            {filterCategory?.map((category, index) => {
              const services = servicesByCategory[category.id] || [];
              /* filterCategory is already pre-filtered to only
                 non-empty categories — keeping a defensive guard
                 here is fine (a category losing all its services
                 between filter time and render is a non-issue). */
              if (!services.length) return null;
              const number = String(index + 1).padStart(2, "0");
              const tagline = CATEGORY_TAGLINES[category.category_name];
              return (
                <section
                  key={category.id}
                  ref={(el) => {
                    if (el) {
                      categorySectionRefs.current[category.id] = el;
                    } else {
                      delete categorySectionRefs.current[category.id];
                    }
                  }}
                  className="service-category-section"
                >
                  <div className="service-category-header">
                    <span className="service-category-number">{number}</span>
                    <span className="service-category-slash">/</span>
                    <h3 className="service-category-name font-primary">
                      {category.category_name}
                    </h3>
                  </div>
                  {tagline && (
                    <p className="service-category-tagline">{tagline}</p>
                  )}
                  <div className="service-category-divider"></div>

                  <div className="service-category-grid">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="home-service-card text-center"
                      >
                        <Link
                          href={`/services/${service?.slug}`}
                          style={{ width: "100%" }}
                        >
                          <Image
                            src={imgErrors[service?.id] || !(service?.image && String(service.image).trim()) ? "/Images/videoThumbnail.svg" : service.image}
                            alt={service?.title || "service"}
                            onError={() => setImgErrors((prev) => ({ ...prev, [service?.id]: true }))}
                            className="max-w-full h-auto w-full"
                            width={600}
                            height={400}
                            style={{ width: "100%", height: "auto" }}
                          />
                          <div className="home-service-card-title-btn-wrapper">
                            <span className="home-explore-button">
                              {service?.button_text}{" "}
                              <GoArrowUpRight size={20} />
                            </span>
                          </div>
                        </Link>

                        <div className="absolute bottom-0 right-0 mb-2 mr-2">
                          <EditLink
                            path={`${ADMIN_URL}/home/service/service_item/show/${service?.id}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
