"use client";

import Image from "next/image";
import Link from "next/link";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";
import { GoArrowUpRight } from "react-icons/go";

const LatestCaseStudies = ({ ClientData }) => {
  const isMobile = useMediaQuery("(max-width: 576px)");

  // Memoize client list to prevent re-rendering on every parent render
  const clientList = ClientData || [];

  return (
    <div className="home-latest-stories-main-wrapper">
      <div className="home-latest-stories-main">
        {/* Section Title */}
        <div className="home-latest-stories-title-subtitle-wrapper">
          <h3 className="uppercase text-neutral-500 home-latest-stories-title font-primary">
            Results That Inspire
          </h3>

          <div className="title-view-all-wrapper">
            <h2 className="home-latest-stories-subtitle font-primary">
              Latest Success Stories
            </h2>

            {!isMobile && (
              <Link href="/case-studies">
                <button className="view-all-button-new">
                  View All
                  <GoArrowUpRight
                    className="secondary-link-arrow"
                    size={20}
                    style={{ strokeWidth: 1 }}
                  />
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Client Cards */}
        <div className="home-latest-stories-card-wrapper">
          {clientList?.map((client, index) => (
            <div
              className="home-latest-stories-card edit-host"
              key={client?.id || index}
            >
              <EditPencil
                to={adminRoutes.home.client(client?.id)}
                label={client?.client_title || "this case study"}
              />
              <Link href={`/case-studies/${client?.slug}`}>
                {client?.client_img ? (
                  <Image
                    src={client.client_img}
                    alt={client?.client_description || "Client Image"}
                    width={600}
                    height={400}
                    style={{ width: "100%", height: "auto" }}
                  />
                ) : null}

                <p className="font-bold">{client?.client_title}</p>
              </Link>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LatestCaseStudies;