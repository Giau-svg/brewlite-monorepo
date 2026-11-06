import type { Metadata } from "next";
import { PaymentResultPage } from "../../../components/payment-result/payment-result-page";

export const metadata: Metadata = {
  title: "Kết quả thanh toán | BrewLite",
  description: "Xem kết quả thanh toán sau khi giao dịch được xác nhận.",
};

export default function Page() {
  return <PaymentResultPage />;
}
