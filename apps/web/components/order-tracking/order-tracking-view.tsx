import { formatPrice } from "../../lib/format-price";
import { orderTrackingTheme as theme } from "../../lib/order-tracking-theme";
import { FULFILLMENT_STEPS, type FulfillmentStatus, type TrackedOrder } from "../../types/order-tracking";
import { OrderProgress } from "./order-progress";

function isFulfillmentStatus(status: TrackedOrder["status"]): status is FulfillmentStatus {
  return FULFILLMENT_STEPS.includes(status as FulfillmentStatus);
}

function OrderItems({ order }: { order: TrackedOrder }) {
  if (order.items.length === 0) return null;
  return (
    <ul className="mt-4 divide-y divide-[#EFE5D8]">
      {order.items.map((item, index) => (
        <li key={`${item.name}-${index}`} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold">{item.name}</h3>
            <p className="shrink-0 text-sm">Số lượng: {item.quantity}</p>
          </div>
          {item.sizeName && <p className="mt-1 text-sm text-[#87776B]">Size: {item.sizeName}</p>}
          {item.toppings.length > 0 && (
            <p className="mt-1 text-sm text-[#87776B]">Topping: {item.toppings.join(", ")}</p>
          )}
          {item.note && <p className="mt-1 text-sm text-[#87776B]">Ghi chú: {item.note}</p>}
          {item.lineTotal !== null && (
            <p className="mt-1 text-sm">Thành tiền: {formatPrice(item.lineTotal)}đ</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function OrderDetails({ order }: { order: TrackedOrder }) {
  return (
    <section className={theme.panel}>
      <p className="text-sm text-[#87776B]">Mã đơn</p>
      <h2 className="mt-1 text-2xl font-bold">{order.orderCode}</h2>
      {order.note && <p className={theme.notice}>Ghi chú đơn: {order.note}</p>}

      {order.status === "PENDING_PAYMENT" && (
        <div>
          <p role="status" className={theme.notice}>Đơn chưa được thanh toán.</p>
          {order.paymentAttempt === "FAILED" && (
            <p className={theme.alert}>
              Lần thanh toán gần nhất chưa thành công. Đơn vẫn đang chờ thanh toán.
            </p>
          )}
          {order.paymentAttempt === "UNKNOWN" && (
            <p className={theme.notice}>
              Thanh toán đang được xác minh. Đơn chưa được ghi nhận là đã thanh toán.
            </p>
          )}
        </div>
      )}

      {order.status === "CANCELLED" && (
        <p role="status" className={theme.notice}>Đơn đã hủy.</p>
      )}

      {isFulfillmentStatus(order.status) && <OrderProgress status={order.status} />}

      <OrderItems order={order} />

      {order.finalTotal !== null && (
        <p className="mt-4 flex justify-between gap-4 text-base font-bold">
          <span>Tổng thanh toán</span>
          <span>{formatPrice(order.finalTotal)}đ</span>
        </p>
      )}

      {order.pickupInstruction && (
        <p className={theme.notice}>Hướng dẫn nhận tại quầy: {order.pickupInstruction}</p>
      )}
    </section>
  );
}
