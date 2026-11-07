"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type FormEvent } from "react";

const photos = [
  ["gallery-1.jpg", "Ly cà phê với hình latte"],
  ["gallery-2.jpg", "Bánh mới nướng"],
  ["gallery-3.jpg", "Pha chế cân hạt"],
  ["gallery-4.jpg", "Pha pour-over"],
  ["gallery-5.jpg", "Hạt cà phê"],
  ["gallery-6.jpg", "Khách ngồi cạnh cửa sổ"],
] as const;

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (index === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIndex(null);
      if (event.key === "ArrowRight") setIndex((current) => current === null ? current : (current + 1) % photos.length);
      if (event.key === "ArrowLeft") setIndex((current) => current === null ? current : (current + photos.length - 1) % photos.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index]);

  return (
    <section className="section" id="gallery" style={{ background: "var(--paper)" }} aria-labelledby="gallery-title">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow center">Không khí quán</span>
          <h2 className="section-title" id="gallery-title">Góc nhìn từ quầy</h2>

        </div>
        <div className="gallery-grid" style={{ marginTop: "1.5rem" }}>
          {photos.map(([file, alt], photoIndex) => (
            <button key={file} className="gallery-item" type="button" onClick={() => setIndex(photoIndex)} aria-label={`Mở ảnh: ${alt}`}>
              <img src={`/images/brand/${file}`} alt={alt} width={300} height={300} />
            </button>
          ))}
        </div>
      </div>
      {index !== null && (
        <div className="lightbox open" role="dialog" aria-modal="true" aria-label="Xem ảnh">
          <button className="lightbox-close" type="button" aria-label="Đóng ảnh" onClick={() => setIndex(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <button className="lightbox-nav prev" type="button" aria-label="Ảnh trước" onClick={() => setIndex((index + photos.length - 1) % photos.length)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18 9 12l6-6" /></svg>
          </button>
          <img src={`/images/brand/${photos[index][0]}`} alt={photos[index][1]} />
          <button className="lightbox-nav next" type="button" aria-label="Ảnh sau" onClick={() => setIndex((index + 1) % photos.length)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </section>
  );
}

export function Newsletter() {
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInvalid(true);
      setMessage("Vui lòng nhập email hợp lệ.");
      return;
    }
    setInvalid(false);
    setMessage("BrewLite chưa nhận đăng ký email. Bạn có thể xem thực đơn để đặt món.");
  }

  return (
    <section className="section newsletter" aria-labelledby="news-title">
      <div className="container bl-split">
        <div>
          <span className="eyebrow">Thư quán</span>
          <h2 className="section-title" id="news-title">Tin món mới</h2>
          <p>Ô này chỉ kiểm tra định dạng email. Hệ thống chưa có API đăng ký nhận tin.</p>
        </div>
        <form className="news-form" onSubmit={onSubmit} noValidate>
          <label htmlFor="news-email" className="visually-hidden">Email</label>
          <input id="news-email" name="email" type="email" placeholder="ban@email.com" autoComplete="email" className={invalid ? "field-error" : undefined} />
          <button type="submit" className="btn btn-espresso">Gửi</button>
          <p className={`news-msg${message ? " ok" : ""}`} role="status" style={{ flexBasis: "100%" }}>{message}</p>
        </form>
      </div>
    </section>
  );
}
