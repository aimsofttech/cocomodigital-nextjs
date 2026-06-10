import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/cart'));

import AddToCart from "@/src/views/cart/AddToCart";

export default function Page() {
  return <AddToCart />;
}