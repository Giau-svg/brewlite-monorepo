import { STAFF_ORDER_FLOW, type StaffBoard, type StaffOrder, type StaffOrderItem, type StaffOrderStatus } from "../types/staff-order";

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

function parseItem(value: unknown): StaffOrderItem | null {
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
  return {
    name,
    quantity: item.quantity,
    sizeName: text(item.sizeName, 40) ?? undefined,
    note: text(item.note, 240) ?? undefined,
    toppings,
  };
}

function parseOrder(value: unknown): StaffOrder | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const id = text(body.id, 80);
  const orderCode = text(body.orderCode, 40);
  const status = text(body.status, 40);
  if (!id || !orderCode || !status || !STAFF_ORDER_FLOW.includes(status as StaffOrderStatus)) return null;
  const placedAt = text(body.placedAt, 40);
  return {
    id,
    orderCode,
    status: status as StaffOrderStatus,
    placedAt: placedAt && !Number.isNaN(new Date(placedAt).getTime()) ? placedAt : undefined,
    items: Array.isArray(body.items) ? body.items.flatMap((item) => {
      const parsed = parseItem(item);
      return parsed ? [parsed] : [];
    }) : [],
    finalTotal: body.finalTotal === undefined ? null : money(body.finalTotal),
  };
}

/** Chỉ nhận đơn từ PAID trở đi. Quyền cập nhật phải được payload xác nhận. */
export function parseStaffBoard(payload: unknown): StaffBoard {
  if (!payload || typeof payload !== "object") return { kind: "error" };
  const body = payload as Record<string, unknown>;
  if (!Array.isArray(body.orders)) return { kind: "error" };
  return {
    kind: "ready",
    orders: body.orders.flatMap((order) => {
      const parsed = parseOrder(order);
      return parsed ? [parsed] : [];
    }),
    canUpdate: body.canUpdate === true,
  };
}
