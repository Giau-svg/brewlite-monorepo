import type { Product } from "../../types/product";
import { formatPrice } from "../../lib/format-price";

type ProductCardProps = { product: Product };

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article
      className="rounded-2xl border border-stone-200 p-6 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="text-5xl">{product.image}</div>

      <h3 className="mt-5 text-xl font-semibold">
        {product.name}
      </h3>

      <p className="mt-2 text-amber-800">
        {formatPrice(product.price)}đ
      </p>

      <p className="mt-3 text-sm text-stone-500">
        Thức uống thơm ngon dành cho bạn.
      </p>
    </article>
  );
}
