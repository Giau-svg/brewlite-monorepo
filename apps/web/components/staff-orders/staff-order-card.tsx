import { formatPrice } from "../../lib/format-price";
import { nextStaffStatus, staffAdvanceLabel, staffStatusLabel } from "../../lib/staff-order-flow";
import { staffOrdersTheme as theme } from "../../lib/staff-orders-theme";
import type { StaffOrder } from "../../types/staff-order";

function formatPlacedAt(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function StaffOrderCard({
  order,
  canUpdate,
  updating,
  onAdvance,
}: {
  order: StaffOrder;
  canUpdate: boolean;
  updating: boolean;
  onAdvance: (order: StaffOrder) => void;
}) {
  const nextStatus = nextStaffStatus(order.status);
  const action = staffAdvanceLabel(order.status);

  return (
    <article className={theme.panel}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold">{order.orderCode}</h2>
        <p className="rounded-full bg-[#F8F5F0] px-3 py-1 text-sm font-medium text-[#67432D]">
          {staffStatusLabel(order.status)}
        </p>
      </div>
      {order.placedAt && <p className="mt-2 text-sm text-[#87776B]">Đặt lúc {formatPlacedAt(order.placedAt)}</p>}
      {order.items.length > 0 && (
        <ul className="mt-4 divide-y divide-[#EFE5D8]">
          {order.items.map((item, index) => (
            <li key={`${order.id}-${index}`} className="py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{item.name}</p>
                <p className="shrink-0">Số lượng: {item.quantity}</p>
              </div>
              {item.sizeName && <p className="mt-1 text-[#87776B]">Size: {item.sizeName}</p>}
              {item.toppings.length > 0 && <p className="mt-1 text-[#87776B]">Topping: {item.toppings.join(", ")}</p>}
              {item.note && <p className="mt-1 text-[#87776B]">Ghi chú: {item.note}</p>}
            </li>
          ))}
        </ul>
      )}
      {order.finalTotal !== null && (
        <p className="mt-3 flex justify-between gap-4 font-bold">
          <span>Tổng thanh toán</span>
          <span>{formatPrice(order.finalTotal)}đ</span>
        </p>
      )}
      {canUpdate && nextStatus && action && (
        <button
          type="button"
          onClick={() => onAdvance(order)}
          disabled={updating}
          className={`${theme.primary} mt-4 w-full sm:w-auto`}
        >
          {updating ? "Đang cập nhật..." : action}
        </button>
      )}
    </article>
  );
}
