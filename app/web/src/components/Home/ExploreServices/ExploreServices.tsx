// @ts-nocheck
import React, { useEffect, useState } from 'react';
import ServicesComponent from '../../common/ServicesComponent/ServicesComponent';

const ExploreServices = ({ ServidcesToShow }) => {
  const [headerTitles, setHeaderTitles] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  // console.log("ServidcesToShow", ServidcesToShow?.services );

 useEffect(()=>{
  const titlesArray = ServidcesToShow?.services?.map(item => item?.service_category_name);
  setHeaderTitles(titlesArray);
  setServiceData(ServidcesToShow?.services[0]?.service_items);
 },[ServidcesToShow])

  return (
      <ServicesComponent title="Explore Our services" header={headerTitles} data={serviceData}/>
  )
}

export default ExploreServices;