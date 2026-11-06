"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "../../types/product";
import { formatPrice } from "../../lib/format-price";

type ProductCardProps = { product: Product };

function ProductImage({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  let valid = false;
  try {
    const parsed = new URL(url ?? "");
    valid = ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch { /* Missing or invalid URLs use the same fallback. */ }
  if (!valid || failed) {
    return <div role="img" aria-label={`Chưa có ảnh ${name}`} className="text-5xl">☕</div>;
  }
  return <Image src={url!} alt={name} width={160} height={160} unoptimized
    className="h-40 w-full rounded-xl object-cover" onError={() => setFailed(true)} />;
}

export function ProductCard({ product }: ProductCardProps) {
  const name = product.name.trim();
  const description = typeof product.description === "string" ? product.description.trim() : "";
  return (
    <article
      className="rounded-2xl border border-stone-200 p-6 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <ProductImage key={product.imageUrl} url={product.imageUrl} name={name} />

      <h3 className="mt-5 text-xl font-semibold">
        {name}
      </h3>

      <p className="mt-2 text-amber-800">
        {formatPrice(product.basePrice)}đ
      </p>

      <p className="mt-3 text-sm text-stone-500">
        {description || "Thức uống thơm ngon dành cho bạn."}
      </p>
    </article>
  );
}
