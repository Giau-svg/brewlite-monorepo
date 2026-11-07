import type { Product } from "../../types/product";
import { ProductCard } from "./product-card";

export function ProductList({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
