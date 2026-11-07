import type { Metadata } from "next";
import { SiteFrame } from "../../components/layout/site-frame";
import { CheckoutReview } from "../../components/checkout/checkout-review";

export const metadata: Metadata = { title: "Xem lại đơn" };

export default function CheckoutPage() {
  return (
    <SiteFrame>
      <CheckoutReview />
    </SiteFrame>
  );
}
