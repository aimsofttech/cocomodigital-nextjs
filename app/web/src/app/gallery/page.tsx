import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/gallery'));

import Gallery from "@/src/views/Gallery/Gallery";

export default function Page() {
  return <Gallery />;
}