import { Suspense } from "react";
import dynamic from "next/dynamic";

import HeroBanner from "../../components/Home/HeroBanner/HeroBanner";
import TrustedBrandsMarquee from "../../components/Home/TrustedBrandsMarquee/TrustedBrandsMarquee";
import ChannelSupportServices from "../../components/Home/ChannelSupportServices/ChannelSupportServices";
import GrowthVideoStats from "../../components/Home/GrowthVideoStats/GrowthVideoStats";
import AudienceSolutionsGrid from "../../components/Home/AudienceSolutionsGrid/AudienceSolutionsGrid";
import LatestCaseStudies from "../../components/Home/LatestCaseStudies/LatestCaseStudies";
import BookCallBanner from "../../components/Home/BookCallBanner/BookCallBanner";
import ExploreOurServices from "../../components/Home/ExploreServices/services";
import BusinessCareerSection from "../../components/Home/HireJoinCta/HireJoinCta";
import YouTubeChannelsSkeleton from "../../components/Home/YouTubeChannels/YouTubeChannelsSkeleton";

import { ADMIN_URL } from "../../utils/constant";

import type {
  HomePageServerData,
  HomeData,
  YoutubeSection,
} from "../../lib/homeServerFetch";

const YouTubeChannels = dynamic(
  () => import("../../components/Home/YouTubeChannels/YouTubeChannels"),
  {
    loading: () => <YouTubeChannelsSkeleton />,
  }
);

interface HomeProps {
  serverData: HomePageServerData;
}

export default function Home({ serverData }: HomeProps) {
  const homeData: HomeData | null = serverData.homeData;

  const youtubeData: YoutubeSection[] | null =
    serverData.youtubeData;

  const youtubeRailSkeleton = <YouTubeChannelsSkeleton />;

  const youtubeFallback = youtubeData ? (
    <>
      {youtubeData.map((item, i) => (
        <YouTubeChannelsSkeleton
          key={i}
          itemCount={item?.items?.length || 5}
        />
      ))}
    </>
  ) : (
    youtubeRailSkeleton
  );

  return (
    <div className="home-main-wrapper">
      <div className="home-main">

        {/* Hero Banner */}
        {homeData?.top_banner ? (
          <HeroBanner
            data={{
              heading: homeData.top_banner.heading,
              image: homeData.top_banner.banner_video_thumbnail ?? "",
              subHeading: homeData.top_banner.sub_heading,
              videoUrl: homeData.top_banner.banner_video_url,
              btnText: homeData.top_banner.banner_button_text,
              adminPath: `${ADMIN_URL}/home/top-banner/edit/${homeData.top_banner.id}`,
            }}
          />
        ) : (
          <div
            className="home-hero-skeleton"
            aria-hidden="true"
          />
        )}

        {/* Trusted Brands */}
        <TrustedBrandsMarquee brands={serverData.brands} />

        {/* Services */}
        <ExploreOurServices
          serviceCategories={serverData.serviceCategories}
          servicesByCategory={serverData.servicesByCategory}
        />

        {/* Other Services */}
        {homeData?.other_service ? (
          <ChannelSupportServices
            ServicesToShow={homeData.other_service}
          />
        ) : (
          <div
            className="home-section-skeleton home-section-skeleton--services"
            aria-hidden="true"
          />
        )}

        {/* Video Stats */}
        {homeData?.video ? (
          <GrowthVideoStats VideoData={homeData.video} />
        ) : (
          <div
            className="home-section-skeleton home-section-skeleton--video"
            aria-hidden="true"
          />
        )}

        {/* YouTube Channels */}
        <Suspense fallback={youtubeFallback}>
          {youtubeData ? (
            youtubeData.map((item, index) => (
              <YouTubeChannels
                key={index}
                title={item?.category}
                data={item?.items}
              />
            ))
          ) : (
            youtubeRailSkeleton
          )}
        </Suspense>

        {/* Audience Grid */}
        <AudienceSolutionsGrid />

        {/* Case Studies */}
        {homeData?.client ? (
          <LatestCaseStudies
            ClientData={homeData.client}
          />
        ) : (
          <div
            className="home-section-skeleton home-section-skeleton--clients"
            aria-hidden="true"
          />
        )}

        {/* Book Call Banner */}
        {serverData.bookCallData ? (
          <div className="home-book-call-container-wrapper">
            <div className="home-book-call-container">
              <BookCallBanner
                bookCallData={serverData.bookCallData}
              />
            </div>
          </div>
        ) : (
          <div
            className="home-section-skeleton home-section-skeleton--cta"
            aria-hidden="true"
          />
        )}

        {/* Business Career Section */}
        <BusinessCareerSection
          hireUsItems={serverData.hireUsItems}
        />

      </div>
    </div>
  );
}