import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/privacy-policy'));

import PrivacyPolicy from "@/src/views/Legal/PrivacyPolicy";

export default function Page() {
  return <PrivacyPolicy />;
}