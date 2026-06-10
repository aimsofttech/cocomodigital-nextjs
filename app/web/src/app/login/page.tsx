import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/login'));

import Login from "@/src/views/Login/Login";

export default function Page() {
  return <Login />;
}