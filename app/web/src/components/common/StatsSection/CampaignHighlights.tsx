// @ts-nocheck
import SecondaryLink from "../SecondaryLink/SecondaryLink";
import { FaEye, FaFire, FaCogs, FaChartLine } from "react-icons/fa";

const statsData = [
    {
        title: "Trailer Views",
        value: "12M+",
        subtitle: "Total YouTube Views Generated",
        icon: <FaEye />
    },
    {
        title: "Trending Rank",
        value: "#3",
        subtitle: "Highest Rank Achieved on YouTube Trending",
        icon: <FaFire />
    },
    {
        title: "Assets Created",
        value: "50+",
        subtitle: "Unique Campaign Videos and Thumbnails Designed",
        icon: <FaCogs />
    },
    {
        title: "CTR Growth",
        value: "28%",
        subtitle: "Increase in Click-Through Rate from Previous Campaigns",
        icon: <FaChartLine />
    },
];


const CampaignHighlights = () => {
    return (
        <section className="stats-wrapper">
            <div className="stats-header">
                <h2>Campaign Highlights</h2>
                <p>
                    Key achievements from the <strong>Four More Shots Please S1</strong>{" "}
                    YouTube campaign, showcasing engagement, reach, and creative output.
                </p>
            </div>
            <div className="stats-section">
                {statsData.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="icon-box">{stat.icon}</div>
                        <h3>{stat.title}</h3>
                        <p className="stat-value">{stat.value}</p>
                        <span>{stat.subtitle}</span>
                    </div>
                ))}
            </div>
            <div className="flex justify-center content-center mt-5">
                <SecondaryLink title="Book A Call With Us" path="/ScheduleMeeting" />
            </div>
        </section>
    );
};

export default CampaignHighlights;
