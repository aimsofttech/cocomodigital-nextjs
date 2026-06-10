// @ts-nocheck
import React from "react";
import SecondaryLink from "../../common/SecondaryLink/SecondaryLink";

const ProjectSuccess = () => {
  return (
    <div className="marketing-house-success-section-main relative">
      {/* Background Image */}
      <img
        src="../../Images/project-banner.svg"
        alt="Project Success Banner"
        className=" project-sucess-bg"
      />

      {/* Text Content Over Image */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white"
        style={{ width: "90%", maxWidth: "800px" }}
      >
        <div className="marketing-house-success-section-content-btn-wrapper">
          <h1 className="font-primary" style={{ color: "white" }}>
            Want to make your project a success?
          </h1>
          <p className="">
            Let’s chat about how we can help you craft the perfect marketing
            strategy for your film, web-series, or TV show.
          </p>
          <div className="marketing-house-success-section-btn-wrapper">
            <SecondaryLink
              path="/ScheduleMeeting"
              title="Book A Call With Us"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSuccess;
