// @ts-nocheck
// import { IoMdArrowBack, IoMdArrowForward } from "react-icons/io";
import Image from "next/image";
import EditLink from "../../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../../utils/constant";

const StrategyExecutionSection = ({ data, index }) => {
  // const [currentIndex, setCurrentIndex] = useState(0);
  // const filteredData = itemData;


  // const handleNext = () => {
  //   setCurrentIndex((prevIndex) => (prevIndex + 1) % filteredData?.length);
  // };

  // const handlePrev = () => {
  //   setCurrentIndex(
  //     (prevIndex) => (prevIndex - 1 + filteredData.length) % filteredData?.length
  //   );
  // };

  const isHTML = (str = "") => /<\/?[a-z][\s\S]*>/i.test(data?.description);
  const dummyImage = "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/marketing-house-pre-launch-activities/1762139981_Four%20More%20Shots%20Please%20Season%201%20Official%20Trailer.jpg"

  return (

    <div className="pre-launched-activity-content-main w-full">
      <div className={`pre-launched-activity-content-img-wrapper ${index % 2 === 0 ? "strategy-flex-row" : "strategy-flex-reverse"}`}>


        <div className="pre-launched-activity-content-wrapper">
          <h2 className="font-bold desktop-section-title">
            {/* <span className="title-counter">{index + 1}.</span> */}
            {data?.title}
            {data?.type === "ideas" && <EditLink
              path={`${ADMIN_URL}/marketing_house/marketing_house_idea_strategy_planning/show/${data?.id}`}
            />}
            {data?.type === "pre-launch" &&
              <EditLink
                path={`${ADMIN_URL}/marketing_house/marketing_house_pre_launch_activity/show/${data?.id}/${data?.marketing_house_item_id}`}
              />
            }
          </h2>
          {isHTML(data?.description) ? (
            <div
              className="mt-3 w-full text-justify"
              style={{ textAlign: "justify" }}
              dangerouslySetInnerHTML={{ __html: data?.description }}
            />
          ) : (
              <p
                className="mt-3 w-full text-justify break-words"
                style={{ textAlign: "justify" }}
              >
                {data?.description}
              </p>
          )}
        </div>
        <div className="pre-launched-activity-img-wrapper">
          <h2 className="font-bold mobile-section-title">
            {/* <span className="title-counter">{index + 1}.</span> */}
            {data?.title}
            {data?.type === "ideas" && <EditLink
              path={`${ADMIN_URL}/marketing_house/marketing_house_idea_strategy_planning/show/${data?.id}`}
            />}
            {data?.type === "pre-launch" &&
              <EditLink
                path={`${ADMIN_URL}/marketing_house/marketing_house_pre_launch_activity/show/${data?.id}/${data?.marketing_house_item_id}`}
              />
            }
          </h2>
          <div
            style={{ borderRadius: "10px" }}
            className="w-full h-auto bg-black flex justify-center items-center"
          >
            {(data?.image || dummyImage) && (
              <Image
                className="pre-launched-activity-img-wrapper-img w-full h-auto"
                src={data?.image || dummyImage}
                alt={data?.title || "Strategy execution activity"}
                width={600}
                height={400}
                style={{ width: "100%", height: "auto" }}
              />
            )}
          </div>
          {/* {data?.length > 1 &&
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
                } */}
        </div>
      </div>

    </div>
  );
};

export default StrategyExecutionSection;
