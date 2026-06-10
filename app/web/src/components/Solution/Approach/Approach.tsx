// @ts-nocheck
import React from 'react';
import Image from "next/image";
const aproachData = [
  {
    id: 1,
    image: "/Images/solution/aproach1.svg",
    title: "Lorem ipsum dolor sit amet consectetur.",
    discription: "Lorem ipsum dolor sit amet consectetur. Luctus nisl odio aliquet accumsan. Pulvinar amet arcu mauris ipsum feugiat nunc urna pellentesque tristique. Massa mi adipiscing leo ac elementum a lectus.",
  },
  {
    id: 2,
    image: "/Images/solution/aproach2.svg",
    title: "Lorem ipsum dolor sit amet consectetur.",
    discription: "Lorem ipsum dolor sit amet consectetur. Luctus nisl odio aliquet accumsan. Pulvinar amet arcu mauris ipsum feugiat nunc urna pellentesque tristique. Massa mi adipiscing leo ac elementum a lectus.",
  },
  {
    id: 3,
    image: "/Images/solution/aproach3.svg",
    title: "Lorem ipsum dolor sit amet consectetur.",
    discription: "Lorem ipsum dolor sit amet consectetur. Luctus nisl odio aliquet accumsan. Pulvinar amet arcu mauris ipsum feugiat nunc urna pellentesque tristique. Massa mi adipiscing leo ac elementum a lectus.",
  },
  {
    id: 4,
    image: "/Images/solution/aproach4.svg",
    title: "Lorem ipsum dolor sit amet consectetur.",
    discription: "Lorem ipsum dolor sit amet consectetur. Luctus nisl odio aliquet accumsan. Pulvinar amet arcu mauris ipsum feugiat nunc urna pellentesque tristique. Massa mi adipiscing leo ac elementum a lectus.",
  }
]

const Approach = () => {
  return (
    <div className='aproach-main'>
    <div className='aproach'>
        <h1 className='aproach-title font-primary'>Our Approach to Elevating Your Brand</h1>
        <div className='aproach-image-content-main'>
          {aproachData.map((item, index)=>{
            return(
               <div key={index} className={`aproach-image-content-wrapper ${index % 2 === 0 ? "desktop-reverse" : "mobile-col"}`}>
                <Image className='aproch-image' src={item?.image} alt="aproach" width={600} height={400} style={{ width: "100%", height: "auto" }} />
                <div className='aproach-content-wrapper'>
                    <h1>{item?.id}</h1>
                    <div className='aproach-subtitle-para-wrapper'>
                       <h2>{item?.title}</h2>
                       <p>{item?.discription}</p>
                    </div>
                </div>
               </div>
            )
          })
        }
        </div>
    </div>
    </div>
  )
}

export default Approach;