import { buildMetadata, getStaticSeo } from '@/src/lib/seo';

export const metadata = buildMetadata(getStaticSeo('/ScheduleMeeting'));

import ScheduleMeeting from "@/src/views/Sedulemeating/ScheduleMeeting";

export default function Page() {
  return <ScheduleMeeting />;
}