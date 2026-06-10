// @ts-nocheck
"use client";
import SecondaryLink from "../../components/common/SecondaryLink/SecondaryLink";
import { useLocation } from "@/src/lib/navigation";

const ThankYouPage = () => {
  const location = useLocation();
  const { successMessage } = location.state || {};

  return (
    <div className="thankyou-container mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 text-center py-5">
      {/* Thank You Illustration */}
      <div className="thankyou-image mb-4">
        <img
          src="../../Images/thankYou.svg"
          alt="Thank You"
          className="max-w-full h-auto"
          style={{ maxWidth: "300px" }}
        />
      </div>
      {/* Thank You Heading */}
      {/* {successMessage && ( */}
      <div className="alert " role="alert">
        <h1 className="thankyou-title font-bold">{successMessage}</h1>
        <div className="flex items-center justify-center">
          <SecondaryLink title="Go Back to Home" path="/" />
        </div>
      </div>
      {/* )} */}


    </div>
  );
};

export default ThankYouPage;
