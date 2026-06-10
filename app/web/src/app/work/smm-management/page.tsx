import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import WorkCategoryPage from "@/src/views/Work/_shared/WorkCategoryPage";
import { smmManagementData } from "@/src/views/Work/_shared/smmManagementData";
import { mergeApiOverrides } from "@/src/views/Work/_shared/mergeApiOverrides";
import { findBySlug } from "@/src/lib/content";

export async function generateMetadata() {
  const doc = await findBySlug<any>("work-pages", "smm-management");
  const staticSeo = getStaticSeo("/work/smm-management");
  return buildMetadata({
    ...staticSeo,
    title: doc?.meta_title || staticSeo.title,
    description: doc?.meta_description || staticSeo.description,
  });
}

export default async function Page() {
  const doc = await findBySlug<any>("work-pages", "smm-management");
  const merged = mergeApiOverrides(smmManagementData, doc);
  return <WorkCategoryPage data={merged} />;
}
