// @ts-nocheck
import { useEffect, useState } from "react";
import { IoMdArrowBack, IoMdArrowForward } from "react-icons/io";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils";

const ClientRequirement = ({ itemData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [clientRequirement, setClientRequirement] = useState([]);
  const dummyImg = "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/ideas_strategy_planning_image/1743576229_strategyimg.jpg"
  const filteredData = itemData?.ideas_strategy_planning;

  useEffect(() => {
    const requirementsArray = Object.keys(itemData)
      .filter((key) => /^client_requirement_[1-6]$/.test(key))
      .map((key) => itemData[key])
      .filter((value) => value && value.trim() !== "");
    setClientRequirement(requirementsArray);
  }, [itemData]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % filteredData?.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + filteredData.length) % filteredData?.length
    );
  };

  return (
    <>
      <div className="client-requirement-main-wrapper">
        <div className="client-requirement-main">
          {clientRequirement?.length > 0 && (
            <section className="client-requirement">
              <div className="client-requirement-title-discription-wrapper">
                <h2 className="font-bold single-web-series-main-title font-primary">
                  Client Requirement
                  <EditLink
                    path={`${ADMIN_URL}/home/marketing/marketing_house_item/show/${itemData?.id}`}
                  />
                </h2>
                <h5 className="client-requirement-discription">
                  {itemData?.client_requirement_text}
                </h5>
              </div>
              <div className="client-requirement-card-wrapper">
                {clientRequirement?.map((item, index) => {
                  return (
                    <div key={index} className="client-requirement-card">
                      <div className="client-requirement-card-counter-wrapper">
                        <h1>{index + 1}</h1>
                      </div>
                      <p className="client-requirement-card-counter">{item}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {filteredData?.length > 0 &&
            <div className="flex flex-col justify-center items-center w-full">
              <h2 className="single-web-series-main-title font-primary text-center">
                Strategy, Planning & Execution
              </h2>
              <div style={{ marginTop: "3rem" }} className="pre-launched-activity-content-img-wrapper">
                <div className="pre-launched-activity-content-wrapper">
                  <h2 className="font-bold">
                    {filteredData[currentIndex]?.title}
                    {/* Wasn’t there sub-numbering */}
                    <EditLink
                      path={`${ADMIN_URL}/marketing_house/marketing_house_idea_strategy_planning/show/${filteredData[currentIndex]?.id
                        }/${filteredData[currentIndex]?.marketing_house_item_id}`}
                    />
                  </h2>
                  <p
                    className="pt-3"
                    dangerouslySetInnerHTML={{
                      __html: filteredData[currentIndex]?.description || "",
                    }}
                  ></p>
                </div>
                <div className="pre-launched-activity-img-wrapper">
                  <div
                    className="w-full h-auto bg-black flex justify-center items-center rounded"
                  >
                    <img
                      className="pre-launched-activity-img-wrapper-img"
                      src={filteredData[currentIndex]?.image || dummyImg}
                      alt={filteredData[currentIndex]?.title}
                    />
                  </div>
                  {filteredData?.length > 1 &&
                    <div className="flex justify-end mt-3">
                      <button
                        className="monthly-performance-left-btn mr-3"
                        onClick={handlePrev}
                        aria-label="Previous"
                      >
                        <IoMdArrowBack size={22} />
                      </button>
                      <button
                        className="monthly-performance-right-btn"
                        onClick={handleNext}
                        aria-label="Next"
                      >
                        <IoMdArrowForward size={22} />
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </>
  );
};

export default ClientRequirement;
