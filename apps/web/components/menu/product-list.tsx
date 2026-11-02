import type { Product } from "../../types/product";
import { ProductCard } from "./product-card";

type ProductListProps = { products: Product[] };

export function ProductList({ products }: ProductListProps) {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
