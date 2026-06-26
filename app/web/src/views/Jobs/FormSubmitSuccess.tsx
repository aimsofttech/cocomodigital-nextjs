// @ts-nocheck
"use client";
import SecondaryLink from "../../components/common/SecondaryLink/SecondaryLink";
import { useLocation } from "@/src/lib/navigation";

const ThankYouPage = () => {
  const location = useLocation();
  const { successMessage } = (location.state as { successMessage?: string }) || {};

  return (
    <div className="thankyou-container mx-auto flex min-h-[70vh] w-full max-w-360 flex-col items-center justify-center gap-6 px-4 py-12 text-center sm:px-6 lg:px-20">
      {/* Thank You Illustration */}
      <div className="thankyou-image mx-auto w-full max-w-75">
        <img
          src="../../Images/thankYou.svg"
          alt="Thank You"
          className="h-auto w-full"
        />
      </div>
      {/* Thank You Heading */}
      <div role="alert" className="flex flex-col items-center gap-6">
        <h1 className="thankyou-title font-bold">
          {successMessage || "Thank you — we've received your submission!"}
        </h1>
        <SecondaryLink title="Go Back to Home" path="/" />
      </div>
    </div>
  );
};

export default ThankYouPage;
