import type { Metadata } from "next";
import { AdminPromotionsPage } from "../../../components/admin-promotions/admin-promotions-page";

export const metadata: Metadata = {
  title: "Khuyến mãi | BrewLite",
  description: "Quản lý mã giảm giá, điều kiện và lượt sử dụng.",
};

export default function Page() {
  return <AdminPromotionsPage />;
}
