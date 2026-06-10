import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/thank-you'));

import ThankYouPage from "@/src/views/Jobs/FormSubmitSuccess";

export default function Page() {
  return <ThankYouPage />;
}