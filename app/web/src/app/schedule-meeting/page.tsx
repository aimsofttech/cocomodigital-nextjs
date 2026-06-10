import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/schedule-meeting'));

import ScheduleMeetingDetails from "@/src/views/Sedulemeating/ScheduleMeetingDetail";

export default function Page() {
  return <ScheduleMeetingDetails />;
}