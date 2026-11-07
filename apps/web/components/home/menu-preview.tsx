"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Product } from "../../types/product";
import { getProducts } from "../../services/product.service";
import { ProductImage } from "../menu/product-image";

export function MenuPreview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getProducts().then((items) => {
      if (active) setProducts(items.filter((item) => item.isAvailable).slice(0, 4));
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  return (
    <section className="section" aria-labelledby="menu-preview-title">
      <div className="container">
        <div className="menu-preview">
        <div className="menu-preview-copy">
          <h2 className="section-title" id="menu-preview-title">Thực đơn đa dạng</h2>
          <div className="menu-category-descriptions">
            <div><h3>Trà trái cây</h3><p>Tươi mát từ trà và trái cây, mang đến cảm giác thanh nhẹ, sảng khoái.</p></div>
            <div><h3>Đá xay &amp; Matcha</h3><p>Mát lạnh, mềm mịn, kết hợp hương matcha đặc trưng đầy cuốn hút.</p></div>
            <div><h3>Trà sữa</h3><p>Vị trà thơm hòa quyện cùng sữa béo mịn, ngọt ngào trong từng ngụm.</p></div>
            <div><h3>Cà phê</h3><p>Hương vị cà phê đậm đà, thơm nồng, đánh thức năng lượng cho mỗi ngày.</p></div>
          </div>
        </div>
        <div className="menu-preview-content" aria-busy={loading}>
          {loading && <p role="status">Đang tải thực đơn...</p>}
          {!loading && error && <div>
            <p role="alert">Không thể tải hình ảnh món. Vui lòng thử lại.</p>
            <button type="button" className="btn btn-outline-coffee" onClick={() => {
              setError(false); setLoading(true); setAttempt((value) => value + 1);
            }}>Thử lại</button>
          </div>}
          {!loading && !error && products.length === 0 && <p>Thực đơn đang được cập nhật.</p>}
          {!loading && !error && products.length > 0 && <div className="menu-preview-grid">
            {products.slice(0, 4).map((product) => <Link key={product.id}
              href={`/products/${encodeURIComponent(product.id)}`}
              className="menu-preview-tile" aria-label={`Xem ${product.name.trim()}`}>
              <ProductImage key={product.imageUrl} url={product.imageUrl} name={product.name.trim()} frame />
              <span className="menu-preview-name">{product.name.trim()}</span>
            </Link>)}
          </div>}
        </div>
      </div>
      </div>
    </section>
  );
}