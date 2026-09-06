import type { Metadata } from "next";
import Caspian from "@/src/views/Caspian/Caspian";

/* Internal tool on a public domain. noindex/nofollow here and a Disallow
 * in robots.ts — robots.txt is a request, a meta robots tag is the one
 * that keeps a signed-out crawler's view of this URL out of an index. */
export const metadata: Metadata = {
  title: "Caspian — Cocoma media library",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <Caspian />;
}
