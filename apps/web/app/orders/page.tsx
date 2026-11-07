import { SiteFrame } from "../../components/layout/site-frame";
import { OrdersView } from "../../components/orders/orders-view";
export default function OrdersPage() {
  return (
    <SiteFrame>
      <section className="section">
        <div className="container">
          <OrdersView />
        </div>
      </section>
    </SiteFrame>
  );
}
