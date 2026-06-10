// @ts-nocheck
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import { GoArrowUpRight } from "react-icons/go";
import {
  FaYoutube,
  FaMobileAlt,
  FaBullhorn,
  FaMagic,
  FaGlobe,
  FaFilm,
} from "react-icons/fa";

/**
 * Six curated video service formats — replaces the earlier
 * admin-driven "browse by category" list. These are the core
 * formats Cocoma actually ships, each linking to a dedicated
 * service page.
 *
 * TODO (Anil): the `to` slugs are placeholders — update each
 * one to the real service-page route once those exist on the
 * backend / router.
 *
 * Icons are FA5-safe (FaYoutube is branded; the rest are
 * conceptual). Mixing one branded icon with five conceptual
 * ones reads cleanly because YouTube has the strongest
 * universal visual identity in the set.
 */
const SERVICE_FORMATS = [
  { icon: FaYoutube,    label: "YouTube Videos",     to: "/services/youtube-videos" },
  { icon: FaMobileAlt,  label: "Shorts & Reels",     to: "/services/shorts-reels" },
  { icon: FaBullhorn,   label: "Promos & Sizzles",   to: "/services/promos-sizzles" },
  { icon: FaMagic,      label: "Motion Graphics",    to: "/services/motion-graphics" },
  { icon: FaGlobe,      label: "Localisation",       to: "/services/localisation" },
  { icon: FaFilm,       label: "Trailers & Teasers", to: "/services/trailers-teasers" },
];

// `allCategories` was the prop that fed the earlier admin-driven
// category list; preserved on the call site for backward compat
// in case other variants need it later, but no longer consumed
// here. The curated SERVICE_FORMATS above is the source of truth
// for this section.
 
const CreativeHouseServices = ({ serviceData, allCategories }) => {

  return (
    <div className="single-video-page-services-main-warper">
      <div className="single-video-page-services-main">
        {/* Services Section — admin-driven; renders only when
            this creative-house item has services attached. */}
        {serviceData?.length > 0 && <div className="single-video-page-services-section">
          <div className="text-center">
            <h2 className="single-video-how-to-edit-title font-primary">
              Creative House Services
            </h2>
          </div>
          <div className="flex flex-wrap -mx-3">
            {serviceData?.map((service) => (
              <Link
                to={`/service/${service?.id}`}
                key={service?.id}
                className="w-1/2 px-3 lg:w-1/3 lg:px-3 mt-5 px-2 single-video-page-services-section-card"
              >
                <div className="rounded border border-neutral-200 bg-white border-0 shadow-sm h-full">
                  {service?.service_image && (
                    <Image
                      src={service.service_image}
                      alt={service?.service_title}
                      className="w-full rounded-t object-cover"
                      style={{ objectFit: "cover" }}
                      width={600}
                      height={400}
                    />
                  )}
                  <div className="p-4 text-center">
                    <h5 className="single-video-page-services-section-card-title">
                      {service?.service_title}
                    </h5>
                    <p
                      to={service?.link}
                      className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-black text-white hover:bg-neutral-800 single-video-page-services-section-card-btn"
                    >
                      Explore Now{" "}
                      <span>
                        <GoArrowUpRight size={20} />
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>}

        {/* Six core video service formats — sticker-card grid. Each
            card has a distinct icon, hover flips the whole card to
            yellow with a black-icon swap and a right-nudge arrow.
            Reads as "tap me." */}
        <div className="single-video-page-category-section-main">
          <p className="single-video-explore-eyebrow">Our video services</p>
          <h3 className="single-video-how-to-edit-title font-primary">
            Every <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">format</span> you
            might need
          </h3>
          <p className="single-video-explore-sub">
            Six core video formats, all handled in-house — from short-form
            social cuts to feature-length trailers.
          </p>
          <div className="explore-more-grid">
            {SERVICE_FORMATS.map((format, index) => {
              const Icon = format.icon;
              return (
                <Link
                  key={index}
                  to={format.to}
                  className="explore-more-card"
                >
                  <span className="explore-more-card-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="explore-more-card-label">{format.label}</span>
                  <span className="explore-more-card-cta" aria-hidden="true">
                    <GoArrowUpRight />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeHouseServices;
