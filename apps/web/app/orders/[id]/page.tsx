import { Suspense } from "react";
import type { Metadata } from "next";
import { OrderTrackingPage } from "../../../components/order-tracking/order-tracking-page";

export const metadata: Metadata = {
  title: "Theo dõi đơn hàng | BrewLite",
  description: "Xem trạng thái đơn hàng sau khi đơn được xác nhận.",
};

async function OrderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderTrackingPage orderId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-[#87776B]">Đang tải đơn hàng...</p>}>
      <OrderRoute params={params} />
    </Suspense>
  );
}
