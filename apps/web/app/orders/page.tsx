import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "../../components/layout/site-frame";

export const metadata: Metadata = { title: "Đơn hàng" };

export default function OrdersPage() {
  return (
    <SiteFrame>
      <section className="page-hero">
        <div className="container">
          <p className="crumbs"><Link href="/">Trang chủ</Link><span>/</span>Đơn hàng</p>
          <h1>Lịch sử và theo dõi đơn</h1>
          <p>Khách đã đăng nhập sẽ xem đơn của mình khi API đơn hàng được nối.</p>
        </div>
      </section>
      <section className="section">
        <div className="container page-narrow">
          <p className="notice notice-warn">Chưa khả dụng. Backend hiện chưa có API đơn hàng, thanh toán và trạng thái đơn. Trang này không hiển thị đơn giả.</p>
          <Link href="/menu" className="btn btn-espresso">Về menu</Link>
        </div>
      </section>
    </SiteFrame>
  );
}
