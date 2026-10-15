"use client";
import { useEffect } from "react";
import { FaArrowRight } from "react-icons/fa";
import { Link } from "@/src/lib/navigation";
import { useCartCount } from "@/src/lib/cart";
import { useMediaQuery } from "@/src/hooks/useMediaQuery";

/**
 * The fixed bottom "N on your call → Schedule" bar on phones.
 *
 * Same markup and body class as the bar inlined in views/Service/Services.tsx:
 * FloatingCallChip hides itself on a phone once the cart has items and
 * expects this bar to take over, so a page with "Add to call" buttons needs it
 * or the visitor loses the way to their agenda.
 */
export default function DesignMobileCartBar() {
  const cartItemCount = useCartCount();
  const isMobile = useMediaQuery("(max-width: 500px)");
  const visible = isMobile && cartItemCount > 0;

  useEffect(() => {
    document.body.classList.toggle("services-cart-bar-visible", visible);
    return () => {
      document.body.classList.remove("services-cart-bar-visible");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="mobile-add-to-cart-wrapper">
      <p className="mobile-add-to-cart-count-icon">
        <span className="mobile-cart-badge" aria-hidden="true">
          {cartItemCount}
        </span>
        <span className="mobile-cart-label">on your call</span>
      </p>
      <Link
        className="mobile-add-to-cart-link"
        to="/cart"
        aria-label={`Your call agenda — ${cartItemCount} ${cartItemCount === 1 ? "topic" : "topics"}, schedule with Anil`}
      >
        Schedule <FaArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
