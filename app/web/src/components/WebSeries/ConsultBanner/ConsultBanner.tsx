// @ts-nocheck
import Image from "next/image";
import SecondaryLink from "../../common/SecondaryLink/SecondaryLink";

const ConsultBanner = () => {
    return (
        <div className="consult-banner">
            <div className="banner-content">
                <div className="book-consultation-btn-mobile">
                    <SecondaryLink title={"BOOK CONSULTATION"} className={"consult-btn"} path="contact-us" />
                </div>
                <div className="text-container">
                    <h2 className="main-text">
                        READY TO MAKE YOUR <span>WEB-SERIES</span>
                    </h2>
                    <p className="sub-text">
                        VIRAL ON <strong>YOUTUBE</strong> & <strong>SOCIAL MEDIA</strong>?
                    </p>
                </div>
                <div className="book-consultation-btn-large">
                    <SecondaryLink title={"BOOK CONSULTATION"} className={"consult-btn"} path="contact-us" />
                </div>
                <div className="image-container">
                    <Image
                        src="https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/author-image/1743532251_anil%20mahato.jpeg"
                        alt="Consultation Banner"
                        className="consult-img"
                        width={400}
                        height={400}
                        style={{ width: "100%", height: "auto" }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ConsultBanner;
