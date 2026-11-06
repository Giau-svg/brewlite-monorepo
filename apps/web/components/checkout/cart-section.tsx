import Link from "next/link";
import type { CartItem } from "../../types/checkout";

function itemTitle(item: CartItem): string {
  const name = item.product?.name?.trim();
  return name || "Món không có tên trong dữ liệu giỏ hàng";
}

export function CartSection({ items }: { items: CartItem[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Giỏ hàng</h2>
        <p className="mt-3 text-sm leading-6 text-[#87776B]">Giỏ hàng của bạn đang trống.</p>
        <Link href="/#menu" className="mt-4 inline-block text-sm font-semibold text-[#67432D] hover:underline">
          Quay lại thực đơn
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Giỏ hàng</h2>
      <p className="mt-2 text-sm leading-6 text-[#87776B]">
        Danh sách gồm tên món, số lượng và ghi chú. Size và topping hiện trong báo giá khi món có lựa chọn này.
      </p>
      <ul className="mt-4 divide-y divide-[#EFE5D8]">
        {items.map((item, index) => (
          <li key={item.id ?? `${item.productId}-${index}`} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{itemTitle(item)}</h3>
              <p className="shrink-0 text-sm">Số lượng: {item.quantity}</p>
            </div>
            {item.note?.trim() && (
              <p className="mt-1 text-sm text-[#87776B]">Ghi chú: {item.note}</p>
            )}
            {item.sizeId && <p className="mt-1 text-sm">Size đã lưu: {item.sizeId}</p>}
            {item.toppingIds && item.toppingIds.length > 0 && (
              <p className="mt-1 text-sm">Topping đã lưu: {item.toppingIds.join(", ")}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
