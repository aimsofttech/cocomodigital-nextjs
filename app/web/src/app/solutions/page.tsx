import { permanentRedirect } from "next/navigation";

/* The /solutions index was a template page (placeholder copy and
   partner logos that are not clients). The audience pages that
   matter live at /solutions/<slug>; the overview is the home page. */
export default function Page() {
  permanentRedirect("/");
}
