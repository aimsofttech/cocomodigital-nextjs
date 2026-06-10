import Image from "next/image";
import { Link } from "@/src/lib/navigation";
import {
  fallbackBlogAuthor,
  type BlogAuthor,
} from "@/src/lib/adminServerApi";
import { FaArrowRight } from "react-icons/fa";

const BlogAuthorCard = ({
  author = fallbackBlogAuthor,
}: {
  author?: BlogAuthor;
  authorId?: number | string | null;
}) => {
  return (
    <section
      className="blog-author-card"
      aria-labelledby="blog-author-card-name"
    >
      <div className="blog-author-card-avatar">
        {author.author_image && (
          <Image
            src={author.author_image}
            alt={author.author_name}
            width={80}
            height={80}
          />
        )}
      </div>

      <div className="blog-author-card-body">
        <p className="blog-author-card-eyebrow">Written by</p>
        <h3
          className="blog-author-card-name font-primary"
          id="blog-author-card-name"
        >
          {author.author_name}
        </h3>
        {author.role_line && (
          <p className="blog-author-card-role">{author.role_line}</p>
        )}
        {author.author_description && (
          <p className="blog-author-card-bio">{author.author_description}</p>
        )}
        <Link to="/ScheduleMeeting" className="blog-author-card-cta">
          Talk to {author.cta_first_name || "us"}
          <FaArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default BlogAuthorCard;
