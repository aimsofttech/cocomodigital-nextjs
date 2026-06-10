import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/research'));

import Research from "@/src/views/Research/Research";

export default function Page() {
  return <Research />;
}