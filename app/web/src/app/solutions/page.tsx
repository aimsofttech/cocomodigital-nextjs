import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/solutions'));

import Solution from "@/src/views/Solution/Solution";

export default function Page() {
  return <Solution />;
}