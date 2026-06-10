import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/'));

import Home from "@/src/views/Home/Home";
import { fetchHomePageData } from "@/src/lib/homeServerFetch";

export default async function Page() {
  const data = await fetchHomePageData();
  return <Home serverData={data} />;
}
