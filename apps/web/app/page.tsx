
"use client";

import { useEffect, useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("http://localhost:3001/products");

        if (!response.ok) {
          throw new Error("Không thể tải menu.");
        }

        const data: Product[] = await response.json();
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
      <header className="flex items-center justify-between border-b border-stone-200 px-6 py-5 md:px-16">
        <h1 className="text-2xl font-bold tracking-tight">
          BrewLite<span className="text-amber-700">.</span>
        </h1>

        <nav className="flex gap-6 text-sm">
          <a href="#menu" className="hover:text-amber-700">
            Menu
          </a>
          <a href="#about" className="hover:text-amber-700">
            Về chúng tôi
          </a>
        </nav>
      </header>

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
            <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
              {products.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-stone-200 p-6 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="text-5xl">{item.image}</div>

                  <h3 className="mt-5 text-xl font-semibold">
                    {item.name}
                  </h3>

                  <p className="mt-2 text-amber-800">
                    {item.price.toLocaleString("vi-VN")}đ
                  </p>

                  <p className="mt-3 text-sm text-stone-500">
                    Thức uống thơm ngon dành cho bạn.
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer
        id="about"
        className="px-6 py-8 text-center text-sm text-stone-500"
      >
        © 2026 BrewLite · Cà phê dành cho mỗi ngày.
      </footer>
    </main>
  );
}
