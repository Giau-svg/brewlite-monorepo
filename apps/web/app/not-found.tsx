import Link from "next/link";
import { SiteFrame } from "../components/layout/site-frame";

export default function NotFound() {
  return (
    <SiteFrame>
      <section className="page-hero">
        <div className="container">
          <h1>Không tìm thấy trang</h1>
          <p>Đường dẫn này không có trong BrewLite.</p>
          <Link href="/" className="btn btn-sage">Về trang chủ</Link>
        </div>
      </section>
    </SiteFrame>
  );
}
