import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/terms'));

import Terms from "@/src/views/Legal/Terms";

export default function Page() {
  return <Terms />;
}