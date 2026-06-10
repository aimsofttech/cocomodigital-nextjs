import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/booking-confirmed'));

import BookingConfirmed from "@/src/views/Sedulemeating/BookingConfirmed";

export default function Page() {
  return <BookingConfirmed />;
}