"use client";

import { useEffect, useState } from "react";
import type { Product } from "../../types/product";
import { getProducts } from "../../services/product.service";
import { normalizeSearch } from "../../lib/normalize-search";
import { ProductList } from "./product-list";

export function MenuCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);

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

  const normalizedQuery = normalizeSearch(query);
  const filteredProducts = products.filter((product) =>
    normalizeSearch(product.name).includes(normalizedQuery),
  );

  function retry() {
    setError("");
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  return (
      <section id="menu" className="bg-white px-6 py-16 md:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-800">
            Menu nổi bật
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Bạn muốn uống gì hôm nay?
          </h2>

          {loading && (
            <p role="status" className="mt-8 text-stone-500">
              Đang tải menu...
            </p>
          )}

          {!loading && error && (
            <div className="mt-8">
              <p role="alert" className="text-red-600">{error}</p>
              <button type="button" onClick={retry}
                className="mt-4 rounded-full bg-stone-900 px-6 py-3 text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2">
                Thử tải lại
              </button>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <p className="mt-8 text-stone-500">
              Hiện chưa có thức uống nào.
            </p>
          )}

          {!loading && !error && products.length > 0 && (
            <>
              <div className="mt-6 max-w-md">
                <label htmlFor="product-search" className="block text-sm font-medium">Tìm đồ uống theo tên</label>
                <input id="product-search" type="search" value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nhập tên đồ uống"
                  className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 focus-visible:outline-2 focus-visible:outline-amber-800" />
              </div>
              {filteredProducts.length > 0 ? (
                <ProductList products={filteredProducts} />
              ) : (
                <p role="status" className="mt-8 text-stone-500">Không tìm thấy đồ uống phù hợp.</p>
              )}
            </>
          )}
        </div>
      </section>
  );
}
