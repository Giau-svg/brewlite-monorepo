"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "../../types/product";
import { getProducts } from "../../services/product.service";
import { categoryName, categoryOptions, filterCatalog, pageSlice } from "../../lib/catalog";
import { setMenuCategory, setMenuPage, setMenuQuery, useMenuView } from "../../lib/menu-view";
import { FeatureSlider } from "./feature-slider";
import { ProductList } from "./product-list";

export function MenuCatalog({ variant = "home" }: { variant?: "home" | "page" }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localQuery, setLocalQuery] = useState("");
  const [localCategory, setLocalCategory] = useState("Tất cả");
  const [localPage, setLocalPage] = useState(1);
  const shared = useMenuView();
  const query = variant === "page" ? shared.query : localQuery;
  const category = variant === "page" ? shared.category : localCategory;
  const page = variant === "page" ? shared.page : localPage;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (variant !== "page") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const categoryParam = params.get("category");
    const pageParam = Number(params.get("page"));
    if (categoryParam) setMenuCategory(categoryParam);
    if (q) setMenuQuery(q);
    if (Number.isInteger(pageParam) && pageParam > 1) setMenuPage(pageParam);
  }, [variant]);

  useEffect(() => {
    let active = true;
    async function fetchProducts() {
      try {
        const data = await getProducts();
        if (active) setProducts(data);
      } catch {
        if (active) setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchProducts();
    return () => { active = false; };
  }, [attempt]);

  const categories = categoryOptions(products);
  const filteredProducts = filterCatalog(products, category, query);
  const view = pageSlice(filteredProducts, page);
  const groups = Array.from(products.reduce((map, product) => {
    const name = categoryName(product);
    map.set(name, [...(map.get(name) ?? []), product]);
    return map;
  }, new Map<string, Product[]>())).slice(0, 3);

  function retry() {
    setError("");
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  function chooseCategory(name: string) {
    if (variant === "page") setMenuCategory(name);
    else {
      setLocalCategory(name);
      setLocalPage(1);
    }
  }

  function changeQuery(value: string) {
    if (variant === "page") setMenuQuery(value);
    else {
      setLocalQuery(value);
      setLocalPage(1);
    }
  }

  function changePage(next: number) {
    if (variant === "page") setMenuPage(next);
    else setLocalPage(next);
  }

  const states = (
    <>
      {loading && <p role="status">Đang tải menu...</p>}
      {!loading && error && (
        <div>
          <p role="alert">{error}</p>
          <button type="button" onClick={retry} className="btn btn-espresso" style={{ marginTop: "1rem" }}>
            Thử tải lại
          </button>
        </div>
      )}
      {!loading && !error && products.length === 0 && <p>Hiện chưa có thức uống nào.</p>}
    </>
  );

  const shop = !loading && !error && products.length > 0 && (
    <>
      <div className="shop-filters category-bar" role="group" aria-label="Lọc theo danh mục">
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            className={`filter-chip${category === name ? " active" : ""}`}
            aria-pressed={category === name}
            onClick={() => chooseCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {variant === "home" && (
        <div className="menu-search">
          <label htmlFor="product-search" className="field-label">Tìm đồ uống theo tên</label>
          <input
            id="product-search"
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Nhập tên đồ uống"
            className="field-input"
          />
        </div>
      )}
      {view.items.length > 0 ? <ProductList products={view.items} /> : (
        <p role="status">
          {query.trim() ? "Không tìm thấy đồ uống phù hợp." : "Danh mục này chưa có thức uống."}
        </p>
      )}
      {filteredProducts.length > 0 && (
        <nav className="pager" aria-label="Phân trang thực đơn">
          <button type="button" className="btn btn-ghost" onClick={() => changePage(view.page - 1)} disabled={view.page <= 1}>Trước</button>
          <span aria-live="polite">{view.page} / {view.pages}</span>
          <button type="button" className="btn btn-espresso" onClick={() => changePage(view.page + 1)} disabled={view.page >= view.pages}>Sau</button>
        </nav>
      )}
    </>
  );

  if (variant === "page") {
    return (
      <>
        <h1 className="visually-hidden">Thực đơn</h1>
        <FeatureSlider products={products.filter((product) => product.isAvailable)} />
        <section id="shop" className="section menu-shop" aria-label="Danh sách sản phẩm">
          <div className="container">
            {states}
            {shop}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section id="menu" className="section menu-band" aria-label="Thực đơn">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow center">Trên quầy</span>
            <p className="lead-txt">Danh sách lấy từ máy chủ. Bấm vào món để xem chi tiết và thêm vào giỏ.</p>
          </div>
          {loading || error || products.length === 0 ? <div style={{ marginTop: "2rem" }}>{states}</div> : (
            <>
              <div className="bl-cols-3" style={{ marginTop: "2.5rem" }}>
                {groups.map(([name, items]) => (
                  <div key={name}>
                    <h3 className="menu-col-title"><span className="ico" aria-hidden="true">◗</span> {name}</h3>
                    <div className="menu-item-wrap">
                      {items.slice(0, 6).map((product) => (
                        <div className="menu-item" key={product.id}>
                          <Link className="menu-link mi-name" href={`/products/${product.id}`}>{product.name.trim()}</Link>
                          <span className="mi-dots" />
                          <Link className="mi-price" href={`/products/${product.id}`}>Xem</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bl-center" style={{ marginTop: "2.5rem" }}>
                <Link href="/menu" className="btn btn-outline-coffee btn-lg">Xem menu đầy đủ</Link>
              </div>
            </>
          )}
        </div>
      </section>
      {!loading && !error && products.length > 0 && (
        <section id="drinks" className="section" aria-label="Đồ uống">
          <div className="container">
            <div className="bl-head-row" style={{ flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div className="section-head center" style={{ width: "100%" }}>
                <span className="eyebrow center">Đang bán</span>
                <p className="lead-txt">Mỗi trang có tối đa 12 món. Giá trên thẻ là giá cơ bản.</p>
              </div>
              <Link href="/menu" className="btn btn-ghost">Tất cả đồ uống</Link>
            </div>
            {shop}
          </div>
        </section>
      )}
    </>
  );
}
