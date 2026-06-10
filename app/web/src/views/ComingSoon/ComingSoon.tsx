// @ts-nocheck
import Image from "next/image";
import { Link } from "@/src/lib/navigation";
const ComingSoon = () => {

  return (
    <div className="coming-soon-root">
      <div className="coming-soon-container">
        <Image
          className="coming-soon-image"
          src="/Images/home/coming-soon.png"
          alt="Under construction illustration"
          width={600}
          height={400}
          style={{ width: "100%", height: "auto" }}
        />

        <h1 className="coming-soon-title">Under Construction</h1>

        <p className="coming-soon-description">
          We're working hard to bring you a better experience. This page is currently
          under construction, but we'll be back soon. Thanks for your patience!
        </p>

        <div className="coming-soon-cta-wrap">
          <Link
            to="/"
            className="coming-soon-cta"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
