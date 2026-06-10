import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/team'));

import Team from "@/src/views/Team/Team";

export default function Page() {
  return <Team />;
}