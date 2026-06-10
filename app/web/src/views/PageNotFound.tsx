// @ts-nocheck
// Pages/NotFound.js
import SecondaryLink from "../components/common/SecondaryLink/SecondaryLink";

const NotFound = () => {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 text-center my-5 flex flex-col items-center justify-center"
      style={{ maxWidth: "500px", minHeight: "60vh" }}>
      <div className="w-full">
        <h1 className="text-5xl leading-tight">404</h1>
        <p className="lead">Page Not Found</p>
        <SecondaryLink title="Go Back to Home" path="/" />
      </div>
    </div>
  );
};

export default NotFound;
