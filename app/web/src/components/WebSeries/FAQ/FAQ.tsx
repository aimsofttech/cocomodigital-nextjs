// @ts-nocheck
import { useEffect, useState } from "react";



const FAQ = ({ slug }) => {
  const [faqItems, setFaqItems] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };


  useEffect(() => {
    const fetchMarketingFaq = async () => {
      try {
        /* Phase 5l: FAQs are embedded on the marketing-house-items
           doc (faqs[] array field). Fetch by slug + read the
           embedded faqs. */
        const url = new URL("/content-api/marketing-house-items", window.location.origin);
        url.searchParams.set("where[slug][equals]", slug);
        url.searchParams.set("limit", "1");
        url.searchParams.set("depth", "0");
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const body = await res.json();
        setFaqItems(body?.docs?.[0]?.faqs ?? []);
      } catch (err) {
        console.error("Error fetching FAQ:", err);
      }
    };

    if (slug) fetchMarketingFaq();
  }, [slug]);


  if (faqItems.length === 0) {
    return null
  }

  return (
    <section className="faq-wrapper">
      <div className="faq-container">
        <div className="faq-header">
          <p className="faq-badge">FAQ</p>
          <h2 className="faq-title font-primary">
            FREQUENTLY ASKED <span>QUESTIONS</span>
          </h2>
          <p className="faq-subtitle">
            Everything you need to know about growing your web series with Cocoma Digital
          </p>
        </div>

        <div className="faq-accordion">
          {faqItems?.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`faq-item ${isOpen ? "faq-item--open" : ""}`}
                onClick={() => toggle(index)}
              >
                <div className="faq-question">
                  <span className="faq-question-text">{item.question}</span>
                  <span className={`faq-icon ${isOpen ? "faq-icon--open" : ""}`}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                    >
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <div
                  className="faq-answer-wrapper"
                  style={{ maxHeight: isOpen ? "400px" : "0px" }}
                >
                  <p className="faq-answer">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
