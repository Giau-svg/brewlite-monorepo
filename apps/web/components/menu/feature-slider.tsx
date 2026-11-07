"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "../../types/product";
import { formatPrice } from "../../lib/format-price";
import { ProductImage } from "./product-image";

const INTERVAL_MS = 4000;

export function FeatureSlider({ products }: { products: Product[] }) {
  const slides = products.filter((product) => product.isAvailable).slice(0, 5);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[index] ?? slides[0];

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!current) return null;

  function step(delta: number) {
    setIndex((value) => (value + delta + slides.length) % slides.length);
  }



  return (
    <section
      className="feature-slider"
      aria-roledescription="carousel"
      aria-label="Sản phẩm nổi bật"
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="feature-track" style={{ transform: `translateX(-${Math.max(0, slides.findIndex((slide) => slide.id === current.id)) * 100}%)` }}>
        {slides.map((product) => (
          <Link key={product.id} className="feature-slide" href={`/products/${product.id}`}
            aria-label={`Xem ${product.name.trim()}`} aria-hidden={product.id !== current.id}
            tabIndex={product.id === current.id ? 0 : -1}>
            <div className="feature-backdrop" aria-hidden="true">
              <ProductImage url={product.imageUrl} name={product.name.trim()} frame />
            </div>
            <div className="feature-main-image">
              <ProductImage url={product.imageUrl} name={product.name.trim()} frame />
            </div>
            <span className="feature-caption">
              <strong>{product.name.trim()}</strong>
              <span>{formatPrice(product.basePrice)}đ</span>
            </span>
          </Link>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" className="feature-nav prev" aria-label="Slide trước" onClick={() => step(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M15 6 9 12l6 6" /></svg>
          </button>
          <button type="button" className="feature-nav next" aria-label="Slide sau" onClick={() => step(1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
          <div className="feature-dots">
            {slides.map((product, dot) => (
              <button
                key={product.id}
                type="button"
                className={dot === index ? "active" : ""}
                aria-label={`Chọn ${product.name.trim()}`}
                aria-current={dot === index}
                onClick={() => setIndex(dot)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
