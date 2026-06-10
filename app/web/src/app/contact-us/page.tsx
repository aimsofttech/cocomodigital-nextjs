import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/contact-us'));

import ContactUs from "@/src/views/contactUs/ContactUs";

export default function Page() {
  return <ContactUs />;
}