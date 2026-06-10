import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/cookie-policy'));

import CookiePolicy from "@/src/views/Legal/CookiePolicy";

export default function Page() {
  return <CookiePolicy />;
}