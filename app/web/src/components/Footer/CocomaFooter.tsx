// @ts-nocheck
"use client";
import Image from "next/image";
import { FaYoutube, FaInstagram, FaFacebookF, FaWhatsapp, FaLinkedinIn } from "react-icons/fa";
import { useCartCount } from "@/src/lib/cart";
import { Link } from "@/src/lib/navigation";
import type { ReactNode } from "react";
import type {
  ShellFooterItem,
  ShellSolutionNavItem,
} from "../../lib/shellServerFetch";

interface SocialLink {
  link: string;
  icon: ReactNode;
  label: string;
}

interface CocomaFooterProps {
  serviceItems: ShellFooterItem[];
  otherServices: ShellFooterItem[];
  /* Phase 8b 2026-05-25: data-driven solutions list from
     solutions-pages collection. */
  solutions: ShellSolutionNavItem[];
}

const FOOTER_COPY = {
  tagline: "India's leading YouTube & social media growth studio.",
  columns: {
    services: "The creative engine behind 45M+ subscribers.",
    platforms: "Native strategy for every social channel.",
    work: "Seven years of receipts.",
    solutions: "Pick your shape — we've built it before.",
    company: "Agency, partners, and people behind Cocoma.",
    connect: "Let's build your growth engine.",
  },
  office: {
    line1: "25, Maa Sharda Villa, Near St. Blaise Church",
    line2: "Amboli, Andheri West, Mumbai, Maharashtra 400058, India",
  },
  inquiry: {
    label: "US / International inquiries",
    email: "hello@cocomadigital.com",
  },
};

export default function CocomaFooter({ serviceItems, otherServices, solutions }: CocomaFooterProps) {
  const cartItemCount = useCartCount();

  const socialLinks: SocialLink[] = [
    {
      link: "https://in.linkedin.com/company/cocomadigital",
      icon: <FaLinkedinIn />,
      label: "LinkedIn",
    },
    {
      link: "https://www.instagram.com/cocomadigital/",
      icon: <FaInstagram />,
      label: "Instagram",
    },
    {
      link: "https://www.youtube.com/channel/UCP3vqjxVD4VlLxDWiKeq1Mg",
      icon: <FaYoutube />,
      label: "YouTube",
    },
    {
      link: "https://wa.me/+918655643377?text=Hello,%20I%20need%20more%20information.",
      icon: <FaWhatsapp />,
      label: "WhatsApp",
    },
    {
      link: "https://www.facebook.com/",
      icon: <FaFacebookF />,
      label: "Facebook",
    },
  ];

  return (
    <footer
      className={`footer-container pt-5 ${cartItemCount > 0 ? "max-[500px]:pb-[60px]" : ""}`}
    >
      <div className="footer-main">
        <div className="footer-top">
          <div className="footer-brand">
            <Image
              className="footer-logo"
              src="/Images/logo/logo-01.png"
              alt="Cocoma Digital"
              width={160}
              height={48}
            />
            <p className="footer-tagline">{FOOTER_COPY.tagline}</p>
          </div>
          <div className="footer-social-media-wrapper">
            {socialLinks.map((item, index) => (
              <Link
                key={index}
                to={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-wrapper"
                aria-label={item.label}
              >
                <span className="social-icon">{item.icon}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="footer-columns">
          <div className="footer-column">
            <h4 className="footer-column-title">Services</h4>
            <p className="footer-column-subheading">
              {FOOTER_COPY.columns.services}
            </p>
            <ul className="footer-link-list">
              {serviceItems.length > 0 ? (
                serviceItems.map((item, index) => (
                  <li key={index}>
                    <Link to={`/services/${item?.slug}`}>{item?.service_title}</Link>
                  </li>
                ))
              ) : (
                <li className="footer-muted">No services available</li>
              )}
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Solutions</h4>
            <p className="footer-column-subheading">
              {FOOTER_COPY.columns.solutions}
            </p>
            <ul className="footer-link-list">
              {/* solutions comes pre-filled with the legacy 10 by
                  shellServerFetch when the the API collection is
                  empty, so this list is never bare. */}
              {solutions.map((s) => (
                <li key={s.slug}>
                  <Link to={`/solutions/${s.slug}`}>{s.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-column footer-column-stack">
            <div className="footer-column">
              <h4 className="footer-column-title">By Platform</h4>
              <p className="footer-column-subheading">
                {FOOTER_COPY.columns.platforms}
              </p>
              <ul className="footer-link-list">
                {otherServices.map((item, index) => (
                  <li key={index}>
                    <Link to={`/services/${item?.slug}`}>{item?.service_title}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-column-title">Our Work</h4>
              <p className="footer-column-subheading">
                {FOOTER_COPY.columns.work}
              </p>
              <ul className="footer-link-list">
                <li><Link to="/work/ip-monetization">IP Monetization</Link></li>
                <li><Link to="/work/content-created">Content Created</Link></li>
                <li><Link to="/work/smm-management">SMM Management</Link></li>
                <li><Link to="/work/marketing-campaigns">Marketing Campaigns</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-column footer-column-stack">
            <div className="footer-column">
              <h4 className="footer-column-title">Company</h4>
              <p className="footer-column-subheading">
                {FOOTER_COPY.columns.company}
              </p>
              <ul className="footer-link-list">
                <li><Link to="/about-us">About Us</Link></li>
                <li><Link to="/team">Meet the team</Link></li>
                <li><Link to="/gallery">Gallery</Link></li>
                <li><Link to="/contact-us">Contact Us</Link></li>
                <li><Link to="/career">Careers at Cocoma</Link></li>
                <li><Link to="/blog">Blog</Link></li>
              </ul>
            </div>

            <div className="footer-column footer-column-connect">
              <h4 className="footer-column-title">Connect</h4>
              <p className="footer-column-subheading">
                {FOOTER_COPY.columns.connect}
              </p>
              <address className="footer-address">
                {FOOTER_COPY.office.line1}<br />
                {FOOTER_COPY.office.line2}
              </address>
              <p className="footer-inquiry">
                <span className="footer-inquiry-label">{FOOTER_COPY.inquiry.label}</span>
                <a
                  className="footer-inquiry-email"
                  href={`mailto:${FOOTER_COPY.inquiry.email}`}
                >
                  {FOOTER_COPY.inquiry.email}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Cocoma Digital Private Limited. All rights reserved.
          </p>
          <ul className="footer-legal-links">
            <li><Link to="/privacy-policy">Privacy</Link></li>
            <li><Link to="/terms">Terms</Link></li>
            <li><Link to="/cookie-policy">Cookies</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
