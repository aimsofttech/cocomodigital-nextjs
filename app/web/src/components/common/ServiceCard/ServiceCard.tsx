// @ts-nocheck
import Image from "next/image";
import Link from "next/link";
import EditLink from "../../Edit-Link/Edit-Link";
import { ADMIN_URL } from "../../../utils/constant";

const ServiceCard = ({ filteredItems }) => {

  return (
    <div className="primary-cards-wrapper">
      {filteredItems?.map((item, index) => (
        <div key={index} className="primary-cards">
          <Link href={`/marketing/${item?.slug}`}>
            {item?.poster_image && (
              <Image
                src={
                  item.poster_image.startsWith("http")
                    ? item.poster_image
                    : `https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/creative-house-thumbnail/${item.poster_image}`
                }
                alt="card-image"
                width={600}
                height={400}
                style={{ width: "100%", height: "auto" }}
              />
            )}
          </Link>
          <div className="absolute bottom-0 right-0 mb-2 mr-2">
            <EditLink
              path={`${ADMIN_URL}/home/marketing/marketing_house_item/show/${item?.id}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceCard;
