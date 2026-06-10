// @ts-nocheck
"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GoArrowUpRight } from "react-icons/go";

const ServicesComponent = ({ header, data, title }) => {
  const [imgErrors, setImgErrors] = useState({});
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20">
        <div className="flex flex-wrap -mx-3 mt-5">
           <div className="lg:w-full lg:px-3">
              {/* <center> */}
                <h1 className="all-service-heading-home font-primary">
                  {title}
                </h1>
              {/* </center> */}
            </div>
        </div>
      {header?.length > 0 && 
       <div className='home-service-header-wrapper'>
        {header?.map((item, index)=>{
        return (
          <h1 
            className='home-service-header-title'  
            key={index}>
            {item}
          </h1>
        )
       })}
       </div>}
    
    {/* Render services for the "Service Platform" category */}
    <div className="flex flex-wrap -mx-3 services mt-1">
        {data?.length > 0 ? (
            data?.map((service) => (
            <div className="md:w-1/2 md:px-3 lg:w-1/3 lg:px-3 sm:w-1/2 sm:px-3  w-1/2 px-3 w-1/2 px-3 mt-2" key={service.id}>
                  <div className="service-card pb-4 text-center">
                    <Link href={`/service/${service.id}`} style={{ width: "100%" }}>
                      <Image
                        src={imgErrors[service.id] ? "/Images/videoThumbnail.svg" : (service?.service_image && String(service.service_image).trim() ? service.service_image : "/Images/videoThumbnail.svg")}
                        alt={service?.service_title || "service"}
                        onError={() => setImgErrors(prev => ({ ...prev, [service.id]: true }))}
                        className="service-image"
                        width={600}
                        height={400}
                        style={{ width: "100%", height: "auto" }}
                      />
                    </Link>
                    <h3>{service.service_title}</h3>
                    <Link href={`/service/${service.id}`}>
                      <button className="explore-button d-lg-block d-md-block ">
                        {service.service_button_text} <GoArrowUpRight size={20} />
                      </button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center mt-5">
                No services available for "Service Platform".
              </p>
            )}
        </div>
    </div>
  )
}

export default ServicesComponent;