// @ts-nocheck
"use client";
import React, { useEffect, useState } from 'react';
import Image from "next/image";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";
import ReactPlayer from 'react-player';

export default function WhyCocomaDigital({ our_advantage_id }) {

    const [ourAdvantage, setOurAdvantage] = useState(null);

    useEffect(() => {
        const fetchOurAdvantages = async () => {
            try {
                /* The marketing item references its advantage by the
                   api ObjectId (our_advantage_template_id); look the
                   single advantage up by that id. */
                const url = new URL("/content-api/our-advantages", window.location.origin);
                if (our_advantage_id) url.searchParams.set("where[id][equals]", String(our_advantage_id));
                url.searchParams.set("limit", "1");
                url.searchParams.set("depth", "1");
                const res = await fetch(url, { headers: { Accept: "application/json" } });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const body = await res.json();
                setOurAdvantage(body?.docs?.[0] ?? null);
            } catch (err) {
                console.error("Error fetching our advantage:", err);
            }
        };
        if (our_advantage_id) fetchOurAdvantages();
    }, [our_advantage_id]);

    return (
        <>
            <section className="why-wrapper">
                <div className="why-container">
                    <section className="why-content-wrapper">
                        <h1 className="why-content-main-title font-priamry font-primary edit-host">
                            Why India’s Biggest Brands Grow With Us?
                            <EditPencil
                                to={adminRoutes.templates.ourAdvantage(our_advantage_id)}
                                label="our advantages"
                            />
                        </h1>
                        <p className="why-content-description mt-2">
                            {ourAdvantage?.description}
                        </p>
                    </section>

                    <section className='why-stats-banner-wrapper'>

                        <div className="why-stats-row-desktop">
                            {ourAdvantage?.metrics?.slice(0, 6).map((stat, idx) => (
                                <React.Fragment key={idx}>

                                    <div className="why-stat-card">
                                        <div
                                            className="why-stat-number font-primary">
                                            {stat?.number}
                                        </div>
                                        <div className="why-stat-desc">
                                            {stat?.title}
                                        </div>
                                    </div>

                                    {idx !== ourAdvantage?.metrics?.length - 1 && (
                                        <div className="divider"></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="why-stats-row-mobile">
                            {ourAdvantage?.metrics?.slice(0, 6)?.map((stat, idx) => (
                                <React.Fragment key={idx}>
                                    <div className="why-stat-card">
                                        <div
                                            className="why-stat-number font-primary">
                                            {stat?.number}
                                        </div>
                                        <div className="why-stat-desc">
                                            {stat?.title}
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Banner Section */}
                        <div className="why-hero-banner-section">
                            {ourAdvantage?.video_url ? (
                                <div className="why-video-wrapper">
                                    <ReactPlayer
                                        url={ourAdvantage?.video_url}
                                        playing
                                        loop
                                        muted
                                        controls={false}
                                        width="100%"
                                        height="100%"
                                        playsinline
                                        config={{ file: { attributes: { preload: "none" } } }}
                                    />
                                </div>
                            ) : (
                                <div className="hero-banner-wrapper">
                                    {ourAdvantage?.image ? (
                                        <Image src={ourAdvantage.image} alt="Banner" className="hero-banner-image" width={1920} height={1080} style={{ width: "100%", height: "auto" }} />
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* The generic Trusted Brands marquee that used to live
                        here is replaced by <RelatedCaseStudies /> rendered
                        from WebSeriesIndividual — industry-relevant peers
                        for the current case study, not a homepage logo wall. */}

                    <section className="why-content-wrapper">
                        <h2 className="why-content-main-title font-primary edit-host">
                            INDUSTRY EXPERIENCE
                            <EditPencil
                                to={adminRoutes.templates.ourAdvantage(our_advantage_id)}
                                label="the industry experience"
                            />
                        </h2>
                        <p className="why-content-description">
                            {ourAdvantage?.industryExperience?.description}
                        </p>
                    </section>

                    {/* experiences section */}
                    <section className="why-industry-experience-wrapper">
                        <div className="why-industry-container">
                            {ourAdvantage?.industryExperience?.metrics?.map((exp, index) => (
                                <div key={index} className="why-industry-card">
                                    <span className="why-industry-card-id" aria-hidden="true">
                                        {`0${index + 1}`}
                                    </span>
                                    {exp?.img && (
                                      <Image
                                          src={exp.img}
                                          alt=""
                                          className="why-industry-card-img"
                                          width={48}
                                          height={48}
                                      />
                                    )}

                                    <div className="why-industry-card-content">
                                        <h3 className="why-industry-card-number">{exp?.number}</h3>
                                        <p className="why-industry-card-title">{exp?.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </section>
        </>
    );
}










