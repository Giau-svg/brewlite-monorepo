/* Brand photography is served from public paths and styled by the Roast image rules. */
/* eslint-disable @next/next/no-img-element */

import { SiteFrame } from "../components/layout/site-frame";
import { MenuPreview } from "../components/home/menu-preview";
import { VideoBanner } from "../components/home/video-banner";
import { ScrollReveal } from "../components/home/scroll-reveal";

export default function Home() {
  return (
    <SiteFrame>
      <VideoBanner />
      <ScrollReveal>

      <section className="section" id="story" aria-labelledby="story-title">
        <div className="container bl-split">
          <div className="story-media">
            <img src="/images/brand/roastery.jpg" alt="Không gian pha chế" width={720} height={820} />
          </div>
          <div>
            <h2 className="section-title" id="story-title">Chất lượng làm nên BrewLite</h2>
            <ul className="quality-list">
              <li><strong>Nguyên liệu chọn lọc:</strong> Hạt cà phê, trà và trái cây được tuyển chọn kỹ lưỡng.</li>
              <li><strong>Công thức chuẩn:</strong> Pha đúng định lượng, vị luôn ổn định.</li>
              <li><strong>Làm mới mỗi ngày:</strong> Nguyên liệu dễ hỏng được chuẩn bị trong ngày.</li>
            </ul>
          </div>
        </div>
      </section>



      <MenuPreview />

      <section id="process" className="section" style={{ background: "var(--cream)" }} aria-labelledby="steps-title">
        <div className="container">
          <div className="section-head center">
            <h2 className="section-title" id="steps-title">Đặt nước trong 4 bước</h2>
          </div>
          <div className="bl-cols-4" style={{ marginTop: "1.5rem" }}>
            {[
              ["process-source.jpg", "1", "Chọn thức uống", "Khám phá thực đơn và lựa chọn món uống yêu thích."],
              ["process-roast.jpg", "2", "Tùy chỉnh theo sở thích", "Chọn size, topping, số lượng và thêm ghi chú."],
              ["process-cup.jpg", "3", "Xác nhận và thanh toán", "Kiểm tra giỏ hàng, xác nhận đơn và thanh toán."],
              ["process-brew.jpg", "4", "Nhận món tại quầy", "Đến quầy nhận thức uống khi đơn hàng đã sẵn sàng."],
            ].map(([image, step, title, text]) => (
              <div className="process-step" key={title}>
                <span className="step-num">{step}</span>
                <div className="step-media"><img src={`/images/brand/${image}`} alt="" width={480} height={360} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section drink-discovery" aria-labelledby="drink-discovery-title">
        <div className="container">
          <h2 className="section-title" id="drink-discovery-title">Điểm tích mỗi ly, mã giảm mỗi ngày.</h2>
          <form action="/menu" method="get" role="search" className="drink-discovery-search">
            <label className="visually-hidden" htmlFor="drink-discovery-query">Tìm thức uống</label>
            <input id="drink-discovery-query" type="search" name="q" placeholder="Khám phá ngay thức uống phù hợp với bạn" />
            <button type="submit" aria-label="Tìm thức uống">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            </button>
          </form>
        </div>
      </section>


      </ScrollReveal>
    </SiteFrame>
  );
}
