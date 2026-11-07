import Link from "next/link";
import type { Product } from "../../types/product";
import { formatPrice } from "../../lib/format-price";
import { ProductImage } from "./product-image";

type ProductCardProps = { product: Product };

export function ProductCard({ product }: ProductCardProps) {
  const name = product.name.trim();
  const soldOut = !product.isAvailable || product.stockQuantity < 1;
  const href = `/products/${product.id}`;

  return (
    <article className="bean-card">
      <Link href={href} className="bean-thumb" aria-label={name}>
        <ProductImage key={product.imageUrl} url={product.imageUrl} name={name} />
        {soldOut ? <span className="pill">Hết hàng</span> : null}
      </Link>
      <div className="bean-body">
        <h3 className="bean-name">
          <Link href={href}>{name}</Link>
        </h3>
        <div className="bean-foot">
          <div className="bean-price">{formatPrice(product.basePrice)}đ</div>
          <Link className="plus-btn" href={href} aria-label={`Xem chi tiết ${name}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
