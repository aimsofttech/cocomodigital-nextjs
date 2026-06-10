// @ts-nocheck
import Image from "next/image";
const Timeline = () => {
  const TimelineData = [
    {
      imagUri: "../../Images/about/groupService.svg",
      year: "2025",
      content: [
        {
          title: " Leading the Future with AI",
          description:
            "Cocoma Digital continues to lead in YouTube growth hacking, expanding its capabilities encompass broader video marketing and social media strategies, while leveraging the power of AI, the company is poised for sustained growth as it adapts to",
        },
      ],
    },
    {
      imagUri: "../../Images/about/GroupService01.svg",
      year: "2024",
      content: [
        {
          title: "Strategic Response to Digital Demand",
          description:
            "The global shift toward digital media during the COVID-19 pandemic accelerated Cocoma's growth. The company scaled operations rapidly to meet the surging demand for content creation and marketing services.",
        },
        {
          title: "High-Profile Collaborations",
          description:
            "Cocoma worked on landmark projects like Mirzapur, The Boys, Reacher, Venom: Let There Be Cranage, The Family Man, Made in Heaven, Panchayat, and many more, solidifying its reputation in the digital media space.",
        },
        {
          title: "Team Expansion & Expertise Growth",
          description:
            "With an expanding team, Cocoma Digital reinforced its commitment to delivering fast, high-quality results for its growing client base.",
        },
        {
          title: "Launch of Cocoma Studios",
          description:
            "Cocoma Studios was established as a specialized entity, focusing on full-scale video production, enhancing the company’s capacity to deliver end-to-end solutions.",
        },
        {
          title: "Strategic Partnerships & Scaling",
          description:
            "Cocoma strengthened its position as a leading player in the digital marketing and content creation industry, working with top-tier clients like Amazon Prime Video, IMDb, Tata eV, MX Player, Amazon MiniTV, Progetto Happiness and many more for major successful campaigns, including IPL promotions.",
        },
        {
          title: "Client-Centric Innovation",
          description:
            "Focused on long-term partnerships, Cocoma delivered consistently outstanding results, helping clients achieve unprecedented digital growth, backed by our case studies.",
        },
      ],
    },
    {
      imagUri: "../../Images/about/groupService.svg",
      year: "2020",
      content: [
        {
          title: "Strategic Consulting for Prime Video",
          description:
            "Cocoma Digital's expertise in digital content and growth led to strategic consulting engagements with major platforms like Prime Video, establishing its presence in the entertainment industry.",
        },
        {
          title: "Growth into YouTube Growth Hacking",
          description:
            "Cocoma Digital transitioned into a full-fledged YouTube growth hacking company, offering tailored solutions to businesses looking to build their brands and maximize their reach on the platform.",
        },
        {
          title: "Expansion into Post-Production",
          description:
            "Expanding its service portfolio, Cocoma became a trusted partner for post-production work, creating trailers, teasers, and promotional content for films, music videos, and high-profile streaming platforms.",
        },
      ],
    },
    {
      imagUri: "../../Images/about/GroupService01.svg",
      year: "2015",
      content: [
        {
          title: "Strategic Consulting for T-Series",
          description:
            "Cocoma Digital's expertise in digital content and growth led to strategic consulting engagements with major platforms like T-Series, solidifying its presence in the entertainment industry.",
        },
      ],
    },
    {
      imagUri: "../../Images/about/groupService.svg",
      year: "2010",
      content: [
        {
          title: "Founding of Expertise",
          description:
            "Cocoma's journey began with the founder's deep engagement with YouTube as a content creator, leveraging the platform to host educational content.",
        },
        {
          title: "Early YouTube Partnership",
          description:
            "As one of the first in India to join the YouTube Partner Program (YPP), the founder established a solid foundation in digital media.",
        },
      ],
    },
  ];

  return (
    <div className="about-timeline-main-wrapper">
      <div className="about-timeline-main">
        <div className="m-auto about-us-third-section-slider-content-wrapper">
          <h1 className="font-bold text-center">A Brief History</h1>
          <p>
            Lorem ipsum dolor sit amet consectetur. Non tortor malesuada lectus
            libero. Ipsum commodo pellentesque elementum ut molestie neque
            mauris. Sed sapien sed fringilla amet
          </p>
        </div>
        <div className="timeline-content-main-wrapper">
          <Image
            src="../../Images/about/upper-arrow.svg"
            className="arrow-upper"
            alt="arrow"
            width={48}
            height={48}
          />
          <div className="about-timeline-content-main">
            {TimelineData?.map((item, index) => {
              return (
                <div
                  key={index}
                  className={`timeline-content-main ${
                    item?.content?.length > 1
                      ? "justify-start items-start"
                      : "timeline-content-main-content-center"
                  }`}
                >
                  <div className="image-year-group">
                    <Image src={item?.imagUri} alt="circle" className="w-full" width={300} height={300} style={{ width: "100%", height: "auto" }} />
                    <span className="year-center-svg">{item?.year}</span>
                  </div>
                  <div className="about-timeline-content-title-dec-wrapper">
                    {item?.content?.map((data, index) => {
                      return (
                        <div className="about-timeline-content-title-dec">
                          <p key={index} className="timeline-title-text">
                            {data?.title}
                          </p>
                          <p className="about-content-description">
                            {data?.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
