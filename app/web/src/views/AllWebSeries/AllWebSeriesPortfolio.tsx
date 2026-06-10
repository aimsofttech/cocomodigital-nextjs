// @ts-nocheck
import AllWebSeries from "../../components/WebSeries/WebSeriesPortfolio";
import WebSeriesGrid from "../../components/WebSeries/WebSeriesGrid";
import BookCallBanner from "../../components/Home/BookCallBanner/BookCallBanner";
// import RelatedServicesSlider from "../../components/CreativeHouseComponent/relatedServices";

// import CreativeProjects from "../../components/CreativeHouseComponent/CreativeHouseHadder";
const AllWebSeriesPortfolio = () => {
  return (
    <>
      {/* <CreativeProjects /> */}
      <AllWebSeries />
      <WebSeriesGrid />
      <AllWebSeries />
      <WebSeriesGrid />
      <AllWebSeries />
      <WebSeriesGrid />
      {/* <RelatedServicesSlider Haddertitle="Related Services" /> */}
      <div className="home-book-call-container-wrapper">
        <div className="home-book-call-container">
          <BookCallBanner />
        </div>
      </div>
      {/* <RelatedServicesSlider Haddertitle="Explore More Film & Media Services" /> */}
    </>
  );
};

export default AllWebSeriesPortfolio;
