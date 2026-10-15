"use client";
import { useCart } from "@/src/lib/cart";
import { DESIGN_ADD_TO_CALL, type DesignCartItem } from "./designData";
import { BTN_DARK, BTN_DARK_ACTIVE, BTN_DARK_IDLE } from "./designTheme";

/**
 * "Add to call" — the same cart toggle the service cards use.
 *
 * Adding puts the block on the visitor's call agenda (src/lib/cart.tsx):
 * the site-wide confetti toast fires, the floating chip switches to
 * "N on your call", and /cart carries the titles into the booking form.
 * Clicking again removes it, as everywhere else on the site.
 */
export default function DesignAddToCallButton({ item }: { item: DesignCartItem }) {
  const { items, addItem, removeItem } = useCart();
  const inCart = items.some((cartItem) => cartItem.id === item.id);

  const toggle = () => {
    if (inCart) {
      removeItem(item.id);
    } else {
      addItem({ ...item, subscriptionType: "One Time Only" });
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={inCart}
      className={`${BTN_DARK} ${inCart ? BTN_DARK_ACTIVE : BTN_DARK_IDLE}`}
    >
      {inCart ? DESIGN_ADD_TO_CALL.added : DESIGN_ADD_TO_CALL.idle}
    </button>
  );
}
