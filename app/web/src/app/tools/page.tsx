import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/tools'));

import Tools from "@/src/views/Tools/Tools";

export default function Page() {
  return <Tools />;
}