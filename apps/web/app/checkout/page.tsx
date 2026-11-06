import type { Metadata } from "next";
import { CheckoutPage } from "../../components/checkout/checkout-page";

export const metadata: Metadata = {
  title: "Thanh toán | BrewLite",
  description: "Xem giỏ hàng và lấy báo giá chính thức trước khi đặt món.",
};

export default function Page() {
  return <CheckoutPage />;
}
