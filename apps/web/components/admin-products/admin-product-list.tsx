import { formatPrice } from "../../lib/format-price";
import { adminProductsTheme as theme } from "../../lib/admin-products-theme";
import type { AdminProduct, AdminTopping } from "../../types/admin-product";

export function AdminProductList({
  products,
  toppings,
  onEdit,
  onToggle,
}: {
  products: AdminProduct[];
  toppings: AdminTopping[];
  onEdit: (product: AdminProduct) => void;
  onToggle: (product: AdminProduct) => void;
}) {
  const toppingName = new Map(toppings.map((topping) => [topping.id, topping.name]));

  return (
    <div className={theme.grid}>
      {products.map((product) => (
        <article key={product.id} className={theme.panel}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="rounded-full bg-[#F8F5F0] px-3 py-1 text-sm text-[#67432D]">
              {product.isAvailable ? "Đang bán" : "Đang ẩn"}
            </p>
          </div>
          {product.description && <p className="mt-2 text-sm text-[#87776B]">{product.description}</p>}
          <p className="mt-3 font-semibold">Giá gốc: {formatPrice(product.basePrice)}đ</p>
          <ul className="mt-2 space-y-1 text-sm">
            {product.sizes.map((size) => (
              <li key={size.id}>{size.name}: +{formatPrice(size.extraPrice)}đ</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-[#87776B]">
            Topping: {product.toppingIds.map((id) => toppingName.get(id)).filter(Boolean).join(", ") || "Không chọn"}
          </p>
          {product.hasOrders && (
            <p className="mt-2 text-sm text-[#87776B]">Sản phẩm đã có đơn. Có thể sửa giá hoặc ẩn, không xóa khỏi lịch sử đơn.</p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => onEdit(product)} className={theme.secondary}>Sửa</button>
            <button type="button" onClick={() => onToggle(product)} className={theme.secondary}>
              {product.isAvailable ? "Ẩn khỏi menu" : "Hiện trên menu"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
