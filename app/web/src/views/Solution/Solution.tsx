import TapSection from "../../components/Solution/TapSection/TapSection";
import { solutionTapData } from "../../utils/constant";
// import MarqueeComponent from "../../components/Marquee/Marquee";
import Announcement from "../../components/Solution/Announcement/Announcement";
import Approach from "../../components/Solution/Approach/Approach";
import Partner from "../../components/Solution/Partner/Partner";
import SecondaryLink from "../../components/common/SecondaryLink/SecondaryLink";
import TrustedBrandsMarquee from "../../components/Home/TrustedBrandsMarquee/TrustedBrandsMarquee";

const Solution = () => {
  return (
    <>
      <div className="solution-main">
        <div className="solution">
          <div className="tap-section-main">
            <TapSection TapData={solutionTapData} />
          </div>
          {/* <MarqueeComponent /> */}
          <TrustedBrandsMarquee />
          <Announcement />
          <div className="line-parent">
            <div className="line-child"></div>
          </div>
          <Approach />
          <h1 className="brand-partner font-primary">Brands We've Partnered With</h1>
          <Partner />
          <SecondaryLink
            className="button-title"
            title="Our Expertise"
            path="/"
          />
        </div>
      </div>
    </>
  );
};

export default Solution;
