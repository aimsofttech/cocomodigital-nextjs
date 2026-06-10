// @ts-nocheck
"use client";
import Image from "next/image";
import { useState } from "react";
import { Link, useNavigate } from "@/src/lib/navigation";
import { useCart } from "@/src/lib/cart";
import { FaArrowRight, FaTrashAlt } from "react-icons/fa";

export default function AddToCart() {
  const navigate = useNavigate();
  const { items: cartItems, removeItem } = useCart();
  const [message, setMessage] = useState();


  const [selections, setSelections] = useState(() => {
    const initial = {};
    cartItems?.forEach((item) => {
      if (item?.subscriptionType) {
        initial[item.id] = { [item.subscriptionType]: true };
      }
    });
    return initial;
  });

  const handleRemoveFromCart = (id) => {
    removeItem(id);
  };

  /**
   * Mutually-exclusive toggle. Clicking either Recurring or
   * One Time Only sets it true and clears the other. Matches the
   * mental model of a radio choice — the agenda item has ONE
   * subscription type for the call, not "both at once". (The
   * scheduling payload still emits both flags so the server can
   * read either; we just guarantee they aren't simultaneously true
   * from the user's intent.)
   */
  const handleSelectionChange = (id, selectedValue) => {
    setSelections((prev) => ({
      ...prev,
      [id]: {
        Recurring: selectedValue === "Recurring",
        "One Time Only": selectedValue === "One Time Only",
      },
    }));
  };

  const onScheduleMeeting = () => {
    /* Validation + payload now read from `selections` only —
       same single-source-of-truth principle as isOptionActive.
       subscriptionType seeded `selections` at mount, so any item
       added via the hero arrives pre-validated; subsequent toggles
       inside the cart override that seed correctly. */
    const unselectedItems = cartItems?.filter((item) => {
      const sel = selections[item.id] || {};
      return !sel.Recurring && !sel["One Time Only"];
    });

    if (unselectedItems?.length > 0) {
      setMessage(
        "Pick Recurring or One Time Only on each topic before scheduling."
      );
      return;
    }

    const payload = cartItems?.map((item) => {
      const sel = selections[item.id] || {};
      return {
        id: item.id,
        group_service_category_id: item?.group_service_category_id,
        Recurring: !!sel.Recurring,
        OneTimeOnly: !!sel["One Time Only"],
      };
    });

    navigate("/ScheduleMeeting", {
      state: {
        cartItems: payload,
      },
    });
  };

  /**
   * Returns whether a given option (Recurring or One Time Only) is
   * currently "active" for an item. Reads ONLY from the local
   * `selections` state — that's now the single source of truth.
   * (The item's `subscriptionType` from the hero seeded `selections`
   * once at mount; after that it's not read again, so user toggles
   * inside the cart take effect immediately.)
   */
  const isOptionActive = (item, option) =>
    !!selections[item?.id]?.[option];

  /**
   * Pull a thumbnail URL from whichever field the cart item actually
   * carries. The canonical field on the cart payload is `thumbnail`
   * — verified by inspecting the persisted Redux state: every item
   * has a `thumbnail` URL set by SingleServiceSlider.handleToggleCart
   * via the spread of the service object. The other fields are
   * defensive fallbacks for any admin-side schema variation.
   */
  const getItemImage = (item) =>
    item?.thumbnail ||
    item?.thumbnailUri ||
    item?.image ||
    item?.featured_image ||
    item?.group_single_service_image?.[0]?.image ||
    null;

  /**
   * Description is HTML on the API (`featured_description` is
   * wrapped in <p> tags etc.). Render as plain text in the cart
   * card to keep the layout tight and predictable — admins
   * sometimes paste long marketing copy that would blow out the
   * 2-line clamp if rendered with markup. Strip tags via a
   * lightweight DOM parse, then trim whitespace.
   */
  const getItemDescription = (item) => {
    const html =
      item?.featured_description ||
      item?.group_service_item_description2 ||
      item?.description ||
      "";
    if (!html) return "";
    if (typeof document === "undefined") return html;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").trim();
  };

  const itemCount = cartItems?.length || 0;
  const isEmpty = itemCount === 0;

  return (
    <div className="cart-page">
      {/* Cart pages shouldn't be indexed — they're per-user and
          contribute nothing useful to search. noIndex keeps them
          out of search results and out of LLM training corpora. */}
      <div className="home-main-wrapper">
        <div className="home-main">
          {/* Sticker hero — eyebrow, count headline, sub copy.
              Always rendered; copy + sub adapt to empty vs filled. */}
          <section className="cart-hero">
            <div className="cart-hero-inner">
              <p className="cart-hero-eyebrow">Your call agenda</p>
              <h1 className="cart-hero-title font-primary">
                {isEmpty
                  ? "Nothing on your agenda yet."
                  : `${itemCount} ${itemCount === 1 ? "topic" : "topics"} ready`}
              </h1>
              <p className="cart-hero-sub">
                {isEmpty
                  ? "Browse our services and tap “Add to call” on anything you'd like to discuss. We'll bring it up on the call."
                  : "What we'll cover when we talk. Pick Recurring or One Time Only on each, then schedule with Anil."}
              </p>
            </div>
          </section>

          {/* ---------- EMPTY STATE ---------- */}
          {isEmpty && (
            <section className="cart-empty">
              <div className="cart-empty-card">
                <div className="cart-empty-illustration" aria-hidden="true">
                  {/* Simple sticker icon — yellow square + black plus */}
                  <span className="cart-empty-plus">+</span>
                </div>
                <p className="cart-empty-line">
                  Pick a few services first. They'll show up here as
                  topics for your call.
                </p>
                <Link to="/" className="cart-empty-cta">
                  Browse services
                  <FaArrowRight aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}

          {/* ---------- FILLED STATE ---------- */}
          {!isEmpty && (
            <>
              <section className="cart-list-section">
                <ul className="cart-list">
                  {cartItems.map((item) => {
                    const thumbSrc = getItemImage(item);
                    const descText = getItemDescription(item);
                    return (
                      <li className="cart-item" key={item.id}>
                        <div className="cart-item-thumb-wrapper">
                          {thumbSrc ? (
                            <Image
                              src={thumbSrc}
                              alt={item?.title || "Service"}
                              className="cart-item-thumb"
                              width={80}
                              height={80}
                              decoding="async"
                            />
                          ) : (
                            <div
                              className="cart-item-thumb cart-item-thumb-fallback"
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        <div className="cart-item-body">
                          <div className="cart-item-head">
                            <h3 className="cart-item-title font-primary">
                              {item?.title || "Untitled service"}
                            </h3>
                            <button
                              type="button"
                              className="cart-item-remove"
                              onClick={() => handleRemoveFromCart(item?.id)}
                              aria-label={`Remove ${item?.title || "this topic"} from your call`}
                            >
                              <FaTrashAlt aria-hidden="true" />
                            </button>
                          </div>

                          {descText && (
                            <p className="cart-item-desc">{descText}</p>
                          )}

                          <div
                            className="cart-item-toggle"
                            role="group"
                            aria-label="Subscription type"
                          >
                            <button
                              type="button"
                              className={`cart-item-toggle-btn ${isOptionActive(item, "Recurring")
                                ? "is-active"
                                : ""
                                }`}
                              onClick={() =>
                                handleSelectionChange(item.id, "Recurring")
                              }
                            >
                              Recurring
                            </button>
                            <button
                              type="button"
                              className={`cart-item-toggle-btn ${isOptionActive(item, "One Time Only")
                                ? "is-active"
                                : ""
                                }`}
                              onClick={() =>
                                handleSelectionChange(item.id, "One Time Only")
                              }
                            >
                              One Time Only
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="cart-footer">
                {/* The bar (message + CTA) becomes a sticky
                    bottom rail on mobile so users always have
                    "Schedule with Anil" within reach without
                    scrolling past the cart items. Fine-print
                    stays in flow below the bar (reassurance
                    copy belongs at the bottom, not floating). */}
                <div className="cart-footer-bar">
                  {message && (
                    <div className="cart-footer-message" role="alert">
                      {message}
                    </div>
                  )}
                  <button
                    type="button"
                    className="cart-footer-cta"
                    onClick={onScheduleMeeting}
                  >
                    Schedule with Anil
                    <FaArrowRight aria-hidden="true" />
                  </button>
                </div>
                <p className="cart-footer-fineprint">
                  We'll walk through each topic on the call. No
                  payment on this site — engagement letters
                  come after we agree on scope.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
