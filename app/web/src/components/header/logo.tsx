// @ts-nocheck
import Image from "next/image";

export default function Logo() {
  return (
    <>
      <div className="logo flex text-center">
        <Image src="/Images/app_logo.svg" alt="cocoma digital" width={40} height={40} />
        <Image src="/Images/app_name.svg" alt="cocoma digital" width={120} height={40} />
      </div>
    </>
  );
}
