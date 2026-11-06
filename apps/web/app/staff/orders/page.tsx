import type { Metadata } from "next";
import { StaffOrdersPage } from "../../../components/staff-orders/staff-orders-page";

export const metadata: Metadata = {
  title: "Đơn tại quầy | BrewLite",
  description: "Xem và cập nhật đơn đã thanh toán tại quầy.",
};

export default function Page() {
  return <StaffOrdersPage />;
}
