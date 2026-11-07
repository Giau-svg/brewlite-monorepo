import { Suspense } from "react";
import { SiteFrame } from "../../../components/layout/site-frame";
import { OrdersView } from "../../../components/orders/orders-view";
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrdersView id={id} />;
}
export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Đang tải đơn…</p>}>
      <SiteFrame>
        <section className="section">
          <div className="container">
            <Suspense fallback={<p>Đang tải…</p>}>
              <Content params={params} />
            </Suspense>
          </div>
        </section>
      </SiteFrame>
    </Suspense>
  );
}
