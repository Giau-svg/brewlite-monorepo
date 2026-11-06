import {
  FULFILLMENT_STEPS,
  type PaymentAttemptStatus,
  type TrackedOrder,
  type TrackedOrderItem,
  type TrackedOrderStatus,
  type OrderTrackingResult,
} from "../types/order-tracking";

const ORDER_STATUSES = new Set<TrackedOrderStatus>([
  "PENDING_PAYMENT",
  ...FULFILLMENT_STEPS,
  "CANCELLED",
]);

const ATTEMPT_STATUSES = new Set<PaymentAttemptStatus>([
  "INITIATED",
  "SUCCEEDED",
  "FAILED",
  "UNKNOWN",
]);

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001F]/.test(trimmed)) return null;
  return trimmed;
}

function money(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function parseItem(value: unknown): TrackedOrderItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = text(item.productName, 120);
  if (!name || typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1) {
    return null;
  }
  const toppings = Array.isArray(item.toppings)
    ? item.toppings.flatMap((topping) => {
        if (!topping || typeof topping !== "object") return [];
        const toppingName = text((topping as { toppingName?: unknown }).toppingName, 80);
        return toppingName ? [toppingName] : [];
      })
    : [];
  const sizeName = text(item.sizeName, 40) ?? undefined;
  const note = text(item.note, 240) ?? undefined;
  return {
    name,
    quantity: item.quantity,
    sizeName,
    note,
    toppings,
    lineTotal: item.lineTotal === undefined ? null : money(item.lineTotal),
  };
}

/**
 * Đọc đơn từ payload đã được Backend xác thực.
 * orderId trên URL không đủ để xem đơn: mã đơn trong payload phải trùng yêu cầu.
 */
export function parseTrackedOrder(payload: unknown, requestedId: string): OrderTrackingResult {
  if (!payload || typeof payload !== "object") return { kind: "error" };
  const body = payload as Record<string, unknown>;
  const id = text(body.id, 80);
  if (!id || id !== requestedId) return { kind: "forbidden" };

  const status = text(body.status, 40);
  if (!status || !ORDER_STATUSES.has(status as TrackedOrderStatus)) return { kind: "error" };

  const orderCode = text(body.orderCode, 40);
  if (!orderCode) return { kind: "error" };

  const attempt = text(body.paymentAttempt, 20);
  const order: TrackedOrder = {
    id,
    orderCode,
    status: status as TrackedOrderStatus,
    items: Array.isArray(body.items) ? body.items.flatMap((item) => {
      const parsed = parseItem(item);
      return parsed ? [parsed] : [];
    }) : [],
    finalTotal: body.finalTotal === undefined ? null : money(body.finalTotal),
  };
  const note = text(body.note, 240);
  const pickupInstruction = text(body.pickupInstruction, 240);
  if (note) order.note = note;
  if (pickupInstruction) order.pickupInstruction = pickupInstruction;
  if (attempt && ATTEMPT_STATUSES.has(attempt as PaymentAttemptStatus)) {
    order.paymentAttempt = attempt as PaymentAttemptStatus;
  }
  return { kind: "order", order };
}
