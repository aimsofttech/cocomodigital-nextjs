import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import WorkCategoryPage from "@/src/views/Work/_shared/WorkCategoryPage";
import { ipMonetizationData } from "@/src/views/Work/_shared/ipMonetizationData";
import { mergeApiOverrides } from "@/src/views/Work/_shared/mergeApiOverrides";
import { findBySlug } from "@/src/lib/content";

export async function generateMetadata() {
  const doc = await findBySlug<any>("work-pages", "ip-monetization");
  const staticSeo = getStaticSeo("/work/ip-monetization");
  return buildMetadata({
    ...staticSeo,
    title: doc?.meta_title || staticSeo.title,
    description: doc?.meta_description || staticSeo.description,
  });
}

export default async function Page() {
  const doc = await findBySlug<any>("work-pages", "ip-monetization");
  const merged = mergeApiOverrides(ipMonetizationData, doc);
  return <WorkCategoryPage data={merged} />;
}
