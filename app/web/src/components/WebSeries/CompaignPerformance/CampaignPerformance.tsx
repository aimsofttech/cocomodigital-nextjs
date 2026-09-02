// @ts-nocheck
import Image from "next/image";
import { adminRoutes } from "../../../lib/adminEditRoutes";
import EditPencil from "../../common/EditPencil/EditPencil";
/* small Star component (SVG) */
const Star = () => (
    <svg className="star-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2.7l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 15.9l-4.6 2.4.9-5.2L4.5 8.2l5.2-.8L12 2.7z" />
    </svg>
);

const dummyImage = "https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/creative-house-thumbnail/1752158570_blanca%20thumbnail.jpeg"

const Item = ({ id, marketingItemId, title, sub, description, image }) => (
    <div className="cp-row">
        <div className="cp-left-block-wrapper">
            <div className="relative">
                {/* back large rounded box */}
                <div className="back-rect">
                    <Image src={image || dummyImage} alt="bg-image" width={600} height={400} style={{ width: "100%", height: "auto" }} />
                </div>
                {/* front small rounded box */}
                <div className="front-rect flex items-center">
                    <div className="star-wrapper">
                        <Star />
                    </div>
                    <div className="text-block ps-3">
                        <div className="cp-value-title">{title}</div>
                        <div className="cp-value-sub">{sub}</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="cp-right-text w-full">
            <p
                className="w-full edit-host"
                style={{textAlign: "justify"}}
            >
                {description}
                <EditPencil
                    to={adminRoutes.marketing.performance(marketingItemId, id)}
                    label={title || "this performance metric"}
                />
            </p>
        </div>
    </div>
);

const CampaignPerformance = ({ itemData }) => {
    const { performance_description, performance } = itemData;


    return (
        <div className="CampaignPerformance-container-wrapper">
            <div className="campaignPerformance-container">
                <div className="cp-main-wrapper">
                    <h1 className="cp-title text-center font-primary edit-host">
                        Campaign Performance
                        <EditPencil
                            to={adminRoutes.marketing.performance(itemData?.id)}
                            label="the campaign performance"
                        />
                    </h1>
                    <p className="cp-sub text-center">
                        {performance_description}
                    </p>

                    <div className="cp-list">
                        {performance && performance.length > 0 ? (
                            performance.map((item, index) => (
                                <Item
                                    key={index}
                                    id={item?.id}
                                    marketingItemId={itemData?.id}
                                    title={item?.title}
                                    sub={item?.sub_title}
                                    description={item?.description}
                                    image={item?.image || ''}
                                />
                            ))
                        ) : (
                            <div className="w-full flex justify-center content-center">
                                <p>Data not available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignPerformance;
