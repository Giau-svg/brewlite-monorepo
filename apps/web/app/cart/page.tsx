import type { Metadata } from "next";
import { SiteFrame } from "../../components/layout/site-frame";
import { CartPageBody } from "../../components/cart/cart-page-body";

export const metadata: Metadata = { title: "Giỏ hàng" };

export default function CartPage() {
  return (
    <SiteFrame>
      <CartPageBody />
    </SiteFrame>
  );
}
