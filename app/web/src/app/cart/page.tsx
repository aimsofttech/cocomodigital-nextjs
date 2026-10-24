import { permanentRedirect } from "next/navigation";

/* The "Add to call" basket is gone. Old links to /cart land on the
   application instead. */
export default function Page() {
  permanentRedirect("/contact-us");
}
