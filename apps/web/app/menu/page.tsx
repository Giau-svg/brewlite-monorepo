import type { Metadata } from "next";
import { SiteFrame } from "../../components/layout/site-frame";
import { MenuCatalog } from "../../components/menu/menu-catalog";

export const metadata: Metadata = { title: "Thực đơn" };

export default function MenuPage() {
  return (
    <SiteFrame>
      <MenuCatalog variant="page" />
    </SiteFrame>
  );
}
