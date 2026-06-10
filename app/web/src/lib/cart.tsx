"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Cart state — the "services I'm interested in discussing on my
 * strategy call" list. Was on Redux + redux-persist via cartSlice;
 * Phase 5c replaces with a simple Context provider + localStorage
 * persistence.
 *
 * Why not Redux:
 *   - 3 actions, ~50 lines of state — too small for the @reduxjs
 *     dependency footprint (~150KB minified after persist)
 *   - All consumers are already client components, no SSR concerns
 *   - localStorage handles persistence trivially
 *
 * Usage:
 *   const { items, addItem, removeItem, clear } = useCart();
 *   const count = useCartCount();
 */

export interface CartItem {
  id: number | string;
  title?: string;
  slug?: string;
  image?: string;
  [key: string]: unknown;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: number | string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "cocoma_cart_v1";

const loadFromStorage = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveToStorage = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* localStorage might be full or disabled — silent fail. */
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  /* Start with empty items (SSR-safe); rehydrate from localStorage
     on the client after first paint via useEffect to avoid hydration
     mismatch. */
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(items);
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem: (item) => {
        setItems((prev) =>
          prev.find((p) => p.id === item.id) ? prev : [...prev, item],
        );
      },
      removeItem: (id) => {
        setItems((prev) => prev.filter((p) => p.id !== id));
      },
      clear: () => setItems([]),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    /* If the provider isn't in the tree (e.g. used outside the
       site-shell), return a no-op shape so consumers don't crash. */
    return {
      items: [],
      addItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
  }
  return ctx;
};

/** Convenience hook — most call sites just want the count. */
export const useCartCount = (): number => useCart().items.length;
