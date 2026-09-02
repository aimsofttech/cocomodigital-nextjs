// @ts-nocheck
"use client";
import { useState } from "react";
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { GoArrowUpRight } from "react-icons/go";
import EditPencil from "@/src/components/common/EditPencil/EditPencil";
import { adminRoutes } from "@/src/lib/adminEditRoutes";

/**
 * Related-services rail at the bottom of a blog post.
 *
 * Phase 4 strangle: dropped the Redux read +
 * adminServiceInstance.Services fallback. The component now ONLY
 * renders when `initialServices` is passed by the parent (which
 * /blog/[slug] does — see src/app/blog/[slug]/page.tsx).
 *
 * Why this is safe to simplify: commonApi was never dispatched
 * anywhere in the codebase, so the old useSelector read always
 * returned an empty array → firstCategory was always undefined →
 * the component already bailed without rendering. The new behavior
 * is just the explicit version of what it actually did at
 * runtime. */
const BlogRelatedServices = ({ initialServices = [] }) => {
  const services = initialServices;
  const [imgErrors, setImgErrors] = useState({});
  if (!services.length) return null;

  return (
    <section
      className="blog-related-services"
      aria-labelledby="blog-related-services-heading"
    >
      <header className="blog-related-services-header">
        <p className="blog-related-services-eyebrow">From our service desk</p>
        <h2
          id="blog-related-services-heading"
          className="blog-related-services-heading font-primary"
        >
          Want help doing this?
        </h2>
        <p className="blog-related-services-pitch">
          A few of the services our team is shipping for clients right now.
        </p>
      </header>

      <div className="blog-related-services-grid">
        {services.map((service) => (
          <Link
            key={service.id}
            to={`/services/${service.slug}`}
            className="blog-related-service-card edit-host"
          >
            <EditPencil
              asButton
              to={adminRoutes.groupService.item(service.id)}
              label={service.title || "this service"}
            />
            <div className="blog-related-service-image-wrapper">
              <Image
                className="blog-related-service-img"
                src={imgErrors[service.id] ? "/Images/videoThumbnail.svg" : (service?.image && String(service.image).trim() ? service.image : "/Images/videoThumbnail.svg")}
                alt={service?.title || "service"}
                width={600}
                height={400}
                onError={() => setImgErrors(prev => ({ ...prev, [service.id]: true }))}
                style={{ width: "100%", height: "auto" }}
              />
            </div>
            <div className="blog-related-service-body">
              {service?.title && (
                <h3 className="blog-related-service-title">
                  {service.title}
                </h3>
              )}
              <span className="blog-related-service-cta">
                {service?.button_text || "Explore"}
                <GoArrowUpRight size={16} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default BlogRelatedServices;
