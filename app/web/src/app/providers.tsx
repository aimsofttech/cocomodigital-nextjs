"use client";
import { type ReactNode } from "react";
import { CartProvider } from "../lib/cart";

/**
 * App-wide providers wrapper.
 *
 * Phase 5c: dropped Redux + redux-persist. Only the cart "services
 * I'm interested in" list needed real client state; it now lives in
 * a lightweight Context (src/lib/cart.tsx) with localStorage
 * persistence. ~150KB bundle savings vs the @reduxjs/toolkit +
 * react-redux + redux-persist combo.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
