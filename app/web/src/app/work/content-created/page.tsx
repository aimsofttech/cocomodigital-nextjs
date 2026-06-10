import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/work/content-created'));

import ContentCreated from "@/src/views/ContentCreated/ContentCreated";

export default function Page() {
  return <ContentCreated />;
}