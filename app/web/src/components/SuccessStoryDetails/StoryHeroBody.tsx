// @ts-nocheck
import { Link } from "@/src/lib/navigation";
import { IoArrowBack } from "react-icons/io5";
import DOMPurify from "dompurify";
import EditLink from "../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../utils/constant";

/**
 * <StoryHeroBody /> — sticker-language case-study article view.
 *
 * Mirrors the BlogDetails page pattern but tuned for client-success
 * stories with extra service emphasis:
 *
 *   - Quiet "← All success stories" back link
 *   - "SUCCESS STORY" eyebrow (or admin-provided category if present)
 *   - Optional service chips strip — renders only if data carries
 *     `services` (array). Surfaces what Cocoma actually delivered for
 *     this client up front, before the body, so a service-shopping
 *     reader sees the offer immediately.
 *   - Display-scale title
 *   - Optional sticker-framed cover image
 *   - Optional outcomes row — KPI tiles ("+200K subs in 6 months",
 *     "₹3M ad revenue") rendered only if data carries `outcomes`.
 *     Compounds the proof before the body if admin tags numbers.
 *   - Body: token-typography wrapping admin HTML (same .client-
 *     description rules already in client.css that handle floated
 *     image overflow, h2/h3, lists, blockquotes, etc.)
 *
 * Renders a hero skeleton when data is undefined so the page shell
 * paints immediately (no full-page Loader gate). Same flicker-fix
 * pattern as /blog + /job.
 */
const StoryHeroBody = ({ data }) => {
  const isLoading = data === undefined || data === null;

  // Defensive field reads — admin schema isn't strictly typed on
  // the frontend; try a couple of likely names for each optional
  // enrichment field. If admin hasn't tagged services / outcomes /
  // category yet, those sections quietly skip.
  const services =
    data?.services ||
    data?.services_used ||
    data?.service_tags ||
    null;
  const outcomes =
    data?.outcomes ||
    data?.results ||
    data?.kpis ||
    null;
  const category =
    data?.category ||
    data?.category_name ||
    data?.industry ||
    "Success Story";

  // Body HTML sanitised on the way in. Was previously rendered via
  // the legacy <ClientDescription /> wrapper which already
  // sanitised; this consolidates the same DOMPurify pass into the
  // hero+body component so the page can drop the wrapper
  // entirely.
  const sanitizedHTML = data?.description
    ? DOMPurify.sanitize(data.description)
    : "";

  return (
    <div className="client-story-content-wrapper">
      <Link
        to="/case-studies"
        className="client-story-back-link"
      >
        <IoArrowBack aria-hidden="true" />
        All case studies
      </Link>

      {isLoading ? (
        <div className="client-story-hero-skeleton" aria-hidden="true" />
      ) : (
        <>
          <header className="client-story-hero">
            <p className="client-story-eyebrow">
              {category.toUpperCase()}
            </p>

            <h1 className="client-story-title font-primary">
              {data?.title}
              <EditLink
                path={`${ADMIN_URL}/home/client/show/${data?.id}`}
              />
            </h1>

            {/* Service chips — admin's tagged scope of work for
                this engagement. Renders only if data carries
                services. Each chip is a sticker outline pill so
                the row reads as a "what we delivered" credentials
                strip rather than navigation. */}
            {Array.isArray(services) && services.length > 0 && (
              <ul
                className="client-story-services"
                aria-label="Services delivered"
              >
                {services.map((s, i) => {
                  const label =
                    typeof s === "string" ? s : s?.name || s?.label;
                  if (!label) return null;
                  return (
                    <li key={i} className="client-story-service-chip">
                      {label}
                    </li>
                  );
                })}
              </ul>
            )}
          </header>

          {data?.image && (
            <div className="client-story-cover">
              <img
                className="client-story-cover-img"
                src={data.image}
                alt={data?.title || "case study cover"}
                loading="lazy"
                decoding="async"
              />
            </div>
          )}

          {/* Outcomes tiles — pulled-out KPI numbers from the
              engagement (e.g. "+200K subs", "+1.2B views",
              "₹3M ad revenue"). Renders before the body so the
              reader sees the result first. Skips entirely when
              admin hasn't tagged outcomes. */}
          {Array.isArray(outcomes) && outcomes.length > 0 && (
            <div
              className="client-story-outcomes"
              aria-label="Outcomes delivered"
            >
              {outcomes.map((o, i) => {
                const value = o?.value || o?.metric || o?.number;
                const label = o?.label || o?.name;
                if (!value && !label) return null;
                return (
                  <div key={i} className="client-story-outcome-tile">
                    <div className="client-story-outcome-value font-primary">
                      {value}
                    </div>
                    {label && (
                      <div className="client-story-outcome-label">
                        {label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Body — admin HTML. Inherits the .client-description
              token-typography rules already shipped in client.css
              (handles floated <img> overflow, h2/h3 spacing, lists,
              blockquotes, links). */}
          <div
            className="client-description"
            dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
          />
        </>
      )}
    </div>
  );
};

export default StoryHeroBody;
