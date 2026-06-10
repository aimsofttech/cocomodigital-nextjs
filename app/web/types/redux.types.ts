import type { CommonApiData, ServiceItem } from "./api.types";

// ─── Slice states ────────────────────────────────────────────────────────────
export interface CartItem {
  id: number | string;
  title?: string;
  price?: number;
  quantity?: number;
  image?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface CartState {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
}

export interface MeState {
  user: string;
}

export interface LangState {
  lang: string;
}

export interface ServicesPayload {
  data?: ServiceItem[];
  total?: number;
  [key: string]: unknown;
}

export interface ServiceState {
  services: ServicesPayload | ServicesPayload[] | null;
  loading: boolean;
  error: string | null | unknown;
}

export interface CommonApiState {
  commonApi: {
    data?: CommonApiData;
    [key: string]: unknown;
  };
  loading: boolean;
  error: string | null | unknown;
}

// ─── Root state ──────────────────────────────────────────────────────────────
export interface RootState {
  cart: CartState;
  me: MeState;
  lang: LangState;
  service: ServiceState;
  commonApi: CommonApiState;
}
