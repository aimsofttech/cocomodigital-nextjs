import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/coming-soon'));

import ComingSoon from "@/src/views/ComingSoon/ComingSoon";

export default function Page() {
  return <ComingSoon />;
}