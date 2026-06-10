import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/All-web-series-portfolio'));

import AllWebSeriesPortfolio from "@/src/views/AllWebSeries/AllWebSeriesPortfolio";

export default function Page() {
  return <AllWebSeriesPortfolio />;
}