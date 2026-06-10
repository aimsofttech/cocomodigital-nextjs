// @ts-nocheck
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import moment from "moment/moment";
import { FaArrowRight } from "react-icons/fa";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";

/**
 * <BlogCard /> — sticker card grid for /blog list.
 *
 * Restructured from the previous legacy column utilities
 * layout (which mixed in-the-card column sizing with parent grid
 * behaviour and made hover states inconsistent across breakpoints)
 * to a plain CSS-grid wrapper with sticker cards inside. Each card
 * is now a self-contained Link with sticker treatment, hover
 * sticker-shift, and the EditLink badge as a corner overlay.
 */
const BlogCard = ({ data }) => {
  return (
    <div className="blog-card-grid">
      {data?.map((item, index) => (
        <article
          className="blog-card-item"
          key={item?.id || item?.slug || index}
        >
          <Link
            to={`/blog/${item?.slug}`}
            className="blog-card-link"
          >
            <div className="blog-card-image-wrapper">
              {item?.image && (
                <Image
                  className="blog-card-img"
                  src={item.image}
                  alt={item?.title || "blog cover"}
                  width={600}
                  height={400}
                  style={{ width: "100%", height: "auto" }}
                />
              )}
            </div>
            <div className="blog-card-body">
              {item?.date && (
                <p className="blog-card-date">
                  {moment(item.date).format("MMM Do, YYYY")}
                </p>
              )}
              <h3 className="blog-card-title font-primary">{item?.title}</h3>
              <span className="blog-card-cta">
                Read post
                <FaArrowRight
                  className="blog-card-cta-icon"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
          {/* EditLink overlays in the top-right; click stops the
              card-level Link navigation so admin's edit click
              doesn't bounce them into the article. */}
          <div
            className="blog-card-edit"
            onClick={(e) => e.stopPropagation()}
          >
            <EditLink path={`${ADMIN_URL}/blog_items/show/${item?.id}`} />
          </div>
        </article>
      ))}
    </div>
  );
};

export default BlogCard;
