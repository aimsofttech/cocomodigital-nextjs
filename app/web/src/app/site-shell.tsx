import type { ReactNode } from "react";
import CocomaFooter from "../components/Footer/CocomaFooter";
import CartCelebration from "../components/common/CartCelebration/CartCelebration";
import Header from "../components/header/header";
import SiteShellEffects from "../components/common/SiteShellEffects/SiteShellEffects";
import ToastHost from "../components/common/ToastHost/ToastHost";
import EditBar from "../components/common/EditBar/EditBar";
import { fetchShellData } from "../lib/shellServerFetch";

export default async function SiteShell({ children }: { children: ReactNode }) {
  const shellData = await fetchShellData();

  return (
    <>
      <SiteShellEffects />
      <ToastHost />
      <Header
        serviceCategories={shellData.serviceCategories}
        initialServices={shellData.initialServices}
        solutions={shellData.solutions}
      />
      <main>{children}</main>
      <CocomaFooter
        serviceItems={shellData.serviceItems}
        otherServices={shellData.otherServices}
        solutions={shellData.solutions}
      />
      <CartCelebration />
      {/* Phase 16: front-end "edit this page" pill. Self-contained —
          renders only for logged-in editors, on detail pages it can
          map to a backend editor. Invisible to anonymous visitors. */}
      <EditBar />
    </>
  );
}
