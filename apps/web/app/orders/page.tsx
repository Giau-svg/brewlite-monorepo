
import type { Metadata } from "next";
import OrderHistory from "../../components/orders/order-history";

export const metadata: Metadata = {
  title: "Lịch sử đơn hàng | BrewLite",
  description: "Xem và theo dõi lịch sử đơn hàng BrewLite",
};

export default function OrdersPage() {
  return <OrderHistory />;
}
