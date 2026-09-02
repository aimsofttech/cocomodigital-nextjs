// @ts-nocheck
import Image from "next/image";
import Link from "next/link";
import { GoArrowUpRight } from "react-icons/go";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";
// import { useSelector } from "react-redux";

const ChannelSupportServices = ({ ServicesToShow }) => {
  // const user = useSelector((state) => state?.me?.user);
  // const [activePlatformData, setActivePlatformData] = useState(null);
  // const [activeViewAllData, setActiveViewAllData] = useState(false);

  // const ShowHideMoreDataHandler = () => {
  //   if (activePlatformData.length <= 0) {
  //     setActivePlatformData(servicePlatform?.service_items);
  //   } else {
  //     setActivePlatformData(servicePlatform?.service_items.slice(0, 6));
  //   }
  //   setActiveViewAllData(!activeViewAllData);
  // }

  // Memoize the services list to prevent unnecessary re-renders
  const servicesList = ServicesToShow || [];

  return (
    <div className="home-service-platform-main-wrapper">
      <div className="home-service-platform-main">
        {/* Section sub-positions the non-YouTube services (Instagram,
            TikTok, content localization, etc.) as extensions of the
            core YouTube channel work — per the YouTube-first brand
            positioning we settled on. "Additional Services" framed
            these as afterthoughts; "Around the channel" frames them
            as the supporting stack around the YouTube core, which
            matches how Cocoma actually sells them (existing YouTube
            clients expanding to social + regional content). */}
        <h1 className="home-service-platform-heading font-primary">Around the channel</h1>

        <div className="home-service-platform-card-wrapper">
          {servicesList?.length > 0 ? (
            servicesList?.map((service, index) => (
              <div className="home-service-platform-card edit-host" key={service?.id || index}>
                <EditPencil
                  to={adminRoutes.home.serviceCategory(service?.id)}
                  label={service?.service_title || "this service"}
                />

                  <Link href={`/services/${service?.slug}`}>
                    {service?.service_image && <Image
                      src={service.service_image}
                      alt={service?.service_title || "Service Image"}
                      className="service-image"
                      width={600}
                      height={400}
                      style={{ width: "100%", height: "auto" }}
                    />}
                    <div className="home-service-platform-card-content-wrapper">
                      <h3>{service?.service_title}</h3>
                      <p>
                        <button className="d-lg-block d-md-block">
                          {service?.service_button_text}{" "}
                          <GoArrowUpRight size={20} />
                        </button>
                      </p>
                    </div>
                  </Link>

              </div>
            ))
          ) : (
            <p className="text-center mt-5">
              No services available for "Service Platform".
            </p>
          )}
        </div>

        {/* {ServicesToShow?.length > 6 &&
          <button
            className="home-service-show-more-btn"
            onClick={ShowHideMoreDataHandler}
          >
            {!activeViewAllData ? "Show More" : "Hide More"}
            <img src="/Images//home/dropdown-arrow.svg" alt="down arrow icon" />
          </button>
        } */}
      </div>
    </div>
  );
};

export default ChannelSupportServices;
