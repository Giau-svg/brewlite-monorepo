"use client";

import { useEffect, useState } from "react";

import type { Product } from "../types/product";
import { getProducts } from "../services/product.service";
import { Header } from "../components/layout/header";
import { Footer } from "../components/layout/footer";
import { ProductList } from "../components/menu/product-list";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch {
        setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return (
    <main className="min-h-screen bg-[#faf7f2] text-stone-900">
      <Header />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:px-12 md:py-24">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
            Cà phê mỗi ngày
          </p>

          <h2 className="text-5xl font-bold leading-tight md:text-6xl">
            Một chút cà phê,
            <br />
            một ngày tuyệt vời.
          </h2>

          <p className="mt-6 max-w-md leading-7 text-stone-600">
            Khám phá những thức uống yêu thích và đặt món
            dễ dàng cùng BrewLite.
          </p>

          <a
            href="#menu"
            className="mt-8 inline-block rounded-full bg-stone-900 px-7 py-3 font-medium text-white hover:bg-amber-900"
          >
            Khám phá menu
          </a>
        </div>

        <div className="flex min-h-72 items-center justify-center rounded-3xl bg-[#e9ddcc] p-8">
          <div className="text-center">
            <div className="text-8xl">☕</div>
            <p className="mt-4 text-xl font-semibold">
              Your daily coffee
            </p>
            <p className="mt-2 text-stone-600">
              Fresh · Simple · Delicious
            </p>
          </div>
        </div>
      </section>

      <section id="menu" className="bg-white px-6 py-16 md:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-800">
            Menu nổi bật
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Bạn muốn uống gì hôm nay?
          </h2>

          {loading && (
            <p className="mt-8 text-stone-500">
              Đang tải menu...
            </p>
          )}

          {!loading && error && (
            <p role="alert" className="mt-8 text-red-600">
              {error}
            </p>
          )}

          {!loading && !error && products.length === 0 && (
            <p className="mt-8 text-stone-500">
              Hiện chưa có thức uống nào.
            </p>
          )}

          {!loading && !error && products.length > 0 && (
            <ProductList products={products} />
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
