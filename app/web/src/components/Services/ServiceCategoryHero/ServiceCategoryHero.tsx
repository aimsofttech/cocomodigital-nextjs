// @ts-nocheck
import Slider from "react-slick";
import HeroBanner from "../../Home/HeroBanner/HeroBanner";
import { ADMIN_URL } from "../../../utils/constant";

const ServiceCategoryHero = ({ bannerData }) => {

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: true,
    autoplaySpeed: 3000,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: true,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          arrows: false,
        },
      },
    ],
  };

  if (!bannerData) {
    return (
      <div className="w-full">
        <div
          className="service-banner-skeleton"
          aria-hidden="true"
          aria-busy="true"
        />
      </div>
    );
  }

  if (bannerData.length === 0) {
    return (
      <div className="w-full">
        <div className="service-page-main-wrapper">
          <h5>Banner Not Available</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Slider {...settings}>
        {bannerData.map((banner, index) => (
          <div key={banner?.id || index} className="slider-slide">
            {banner && (
              <HeroBanner
                data={{
                  heading: banner?.heading,
                  image: banner?.image,
                  subHeading: banner?.subheading,
                  videoUrl: banner?.video || banner?.video_url,
                  btnText: banner?.button_text,
                  adminPath: `${ADMIN_URL}/home/group/service/group_service_top_banner/show/${banner?.id}/${banner?.item_id}`,
                }}
              />
            )}
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default ServiceCategoryHero;
