// @ts-nocheck
"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PrimaryButton from "../../common/PrimaryButton/PrimaryButton";
import { useNavigate } from "@/src/lib/navigation";
import { openMailto } from "@/src/lib/email";
import { FaWhatsapp, FaArrowRight } from "react-icons/fa";
import { HiOutlineMail, HiOutlineCalendar } from "react-icons/hi";

// TODO Anil: confirm Calendly booking URL. Placeholder for now.
const CALENDLY_URL = "https://calendly.com/cocomadigital/15min";
const DIRECT_EMAIL = "anil@cocomadigital.com";
// Anil's personal WhatsApp — these CTAs say "Anil directly" so they
// should land on him, not the team inbound number (which is Vishal's).
const WHATSAPP_NUMBER = "+918800528125";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    "Hi Anil — I'd like to talk about a campaign."
)}`;

const ContactPromo = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        email: "",
        projectTitle: "",
        name: "",
        whatsapp: "",
        budget: "",
        releaseDate: "",
        about: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleStep1Continue = (e) => {
        e.preventDefault();
        if (!formData.email || !formData.projectTitle) return;
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            /* Phase 5l: POST to the API contact-leads. Pack the
               project-specific fields (title, budget, release date,
               WhatsApp) into the message body since the lean
               contact-leads schema only has {name, email, phone,
               message}. */
            const message = [
                formData.projectTitle && `Project: ${formData.projectTitle}`,
                formData.budget && `Budget: ${formData.budget}`,
                formData.releaseDate && `Release date: ${formData.releaseDate}`,
                formData.whatsapp && `WhatsApp: ${formData.whatsapp}`,
                formData.about && `\n${formData.about}`,
            ]
                .filter(Boolean)
                .join("\n");

            const res = await fetch("/content-api/contact-leads", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.whatsapp,
                    message,
                }),
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            navigate("/thank-you", {
                state: {
                    date: null,
                    time: null,
                    successMessage: "Form submitted successfully!",
                    cartItems: null,
                    timeZone: null,
                },
            });
            setFormData({
                email: "",
                projectTitle: "",
                name: "",
                whatsapp: "",
                budget: "",
                releaseDate: "",
                about: "",
            });
            setStep(1);
        } catch (error) {
            console.log("error", error);
        }
    };

    return (
        <div className="contact-promo-wrapper">
            <div className="contact-promo-container-wrapper">
                <h2 className="why-content-main-title font-primary">
                    Tell us about your title.<br />
                    We'll send back a{" "}
                    <span className="bg-highlight-yellow bg-[length:100%_100%] bg-no-repeat px-[0.15em] box-decoration-clone">7-day mini-strategy</span>.
                </h2>
                <p className="why-content-description mt-1 w-full content-center">
                    Series, film, or music release — share the brief and we'll reply with how we'd launch it. No call required to start.
                </p>

                {/* Alternative low-friction CTAs for power users who want
                    to skip the form. Visible above the form so they're
                    seen first. */}
                <div className="contact-quick-channels" aria-label="Alternative ways to reach us">
                    <span className="contact-quick-channels-label">Prefer something faster?</span>
                    <div className="contact-quick-channels-row">
                        <Link
                            className="contact-quick-channel"
                            href={`mailto:${DIRECT_EMAIL}?subject=${encodeURIComponent("Project enquiry")}`}
                            onClick={(e) => {
                                e.preventDefault();
                                openMailto(e.currentTarget.href);
                            }}
                        >
                            <HiOutlineMail size={18} />
                            <span>Email Anil directly</span>
                        </Link>
                        <Link
                            className="contact-quick-channel"
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FaWhatsapp size={18} color="#25D366" />
                            <span>WhatsApp</span>
                        </Link>
                        <Link
                            className="contact-quick-channel"
                            href={CALENDLY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <HiOutlineCalendar size={18} />
                            <span>Book 15 min</span>
                        </Link>
                    </div>
                </div>

                <div className="contact-promo-container md:mt-5 mt-3">
                    {/* Left: 2-step form */}
                    <div className="form-section">
                        <form className="contact-form" onSubmit={step === 1 ? handleStep1Continue : handleSubmit}>
                            <div className="contact-form-step-indicator">
                                <span className={`step-dot ${step >= 1 ? "is-active" : ""}`}>1</span>
                                <span className="step-line" />
                                <span className={`step-dot ${step >= 2 ? "is-active" : ""}`}>2</span>
                                <span className="step-label">
                                    {step === 1 ? "Quick brief" : "A few more details"}
                                </span>
                            </div>

                            {step === 1 && (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="form-field">
                                            <label className="form-label font-primary">Email</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                placeholder="you@company.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="form-field">
                                            <label className="form-label font-primary">What are you launching?</label>
                                            <input
                                                type="text"
                                                name="projectTitle"
                                                required
                                                placeholder="Show / film / music release name"
                                                value={formData.projectTitle}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="contact-form-continue-btn"
                                        disabled={!formData.email || !formData.projectTitle}
                                    >
                                        Continue <FaArrowRight size={14} />
                                    </button>

                                    <p className="contact-form-step-note">
                                        Step 1 of 2 — takes ~10 seconds.
                                    </p>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="form-field">
                                            <label className="form-label font-primary">Your name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                required
                                                placeholder="Enter your name"
                                                value={formData.name}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label
                                                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                                            >
                                                <FaWhatsapp color="#25D366" size={20} />
                                                <span className="form-label font-primary">WhatsApp number</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="whatsapp"
                                                required
                                                placeholder="+91 ..."
                                                value={formData.whatsapp}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="form-field">
                                            <label className="form-label font-primary">Campaign budget</label>
                                            <select
                                                name="budget"
                                                required
                                                value={formData.budget}
                                                onChange={handleChange}
                                            >
                                                <option value="">Select budget range</option>
                                                <option value="5000-10000">₹5,000 - ₹10,000</option>
                                                <option value="10000-25000">₹10,000 - ₹25,000</option>
                                                <option value="25000-50000">₹25,000 - ₹50,000</option>
                                                <option value="50000-100000">₹50,000 - ₹1,00,000</option>
                                                <option value="100000+">₹1,00,000+</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label font-primary">When is the release?</label>
                                            <input
                                                type="date"
                                                name="releaseDate"
                                                required
                                                placeholder="DD/MM/YYYY"
                                                value={formData.releaseDate}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="budget-about-form-field">
                                            <label className="form-label font-primary">
                                                Anything else? <span className="form-label-optional">(optional)</span>
                                            </label>
                                            <textarea
                                                name="about"
                                                rows="3"
                                                placeholder="A line or two about goals, audience, or anything we should know"
                                                value={formData.about}
                                                onChange={handleChange}
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div className="contact-form-step2-actions">
                                        <button
                                            type="button"
                                            className="contact-form-back-btn"
                                            onClick={() => setStep(1)}
                                        >
                                            ← Back
                                        </button>
                                        <PrimaryButton
                                            title="SEND ME THE PLAN"
                                            loading={false}
                                        />
                                    </div>
                                </>
                            )}
                        </form>
                    </div>

                    {/* Right Promo Section */}
                    <div className="promo-section">
                        <Image
                            src="https://cocomadigitalmediabucket.s3.eu-north-1.amazonaws.com/book-a-call/1761986854_anil%20mahato%20marketing.png"
                            alt="Anil Mahato — founder, Cocoma Digital"
                            className="promo-image"
                            width={400}
                            height={400}
                            style={{ width: "100%", height: "auto" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPromo;
