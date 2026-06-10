import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/solution'));

import Solution from "@/src/views/Solution/Solution";

export default function Page() {
  return <Solution />;
}