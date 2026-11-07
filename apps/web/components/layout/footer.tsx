import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h2 className="footer-heading">Về BrewLite</h2>
            <ul className="footer-list">
              <li><Link href="/#story">Chất lượng BrewLite</Link></li>
              <li><Link href="/menu">Thực đơn</Link></li>
              <li><Link href="/login">Tài khoản</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer-heading">Hỗ trợ khách hàng</h2>
            <ul className="footer-list">
              <li><Link href="/#process">Hướng dẫn đặt thức uống</Link></li>
              <li><Link href="/cart">Giỏ hàng của bạn</Link></li>
              <li><Link href="/orders">Lịch sử mua hàng</Link></li>
              <li>Nhận thức uống tại quầy BrewLite</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 BrewLite · Cà phê dành cho mỗi ngày.</span>
        </div>
      </div>
    </footer>
  );
}