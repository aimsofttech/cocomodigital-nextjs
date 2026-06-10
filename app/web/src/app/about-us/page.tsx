import { buildMetadata, getStaticSeo } from "@/src/lib/seo";
import AboutUs from "@/src/views/About/about";
import { getBrands, imageUrl } from "@/src/lib/content";

export const metadata = buildMetadata(getStaticSeo("/about-us"));

/* Adapter: the API Brand → legacy {brand_name, brand_image} that
   the AboutUs view uses. */
const adaptBrand = (b: any) => ({
  id: b.id,
  brand_name: b.name,
  brand_image: imageUrl(b),
});

export default async function Page() {
  const { docs } = await getBrands({ limit: 50 });
  return <AboutUs brands={docs.map(adaptBrand)} />;
}
