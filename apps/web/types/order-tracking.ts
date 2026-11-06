export const FULFILLMENT_STEPS = [
  "PAID",
  "PREPARING",
  "READY",
  "COMPLETED",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STEPS)[number];

export type TrackedOrderStatus = FulfillmentStatus | "PENDING_PAYMENT" | "CANCELLED";

/** Trạng thái của lần thanh toán, không phải bước xử lý đơn. */
export type PaymentAttemptStatus = "INITIATED" | "SUCCEEDED" | "FAILED" | "UNKNOWN";

export type TrackedOrderItem = {
  name: string;
  quantity: number;
  sizeName?: string;
  note?: string;
  toppings: string[];
  lineTotal: number | null;
};

export type TrackedOrder = {
  id: string;
  orderCode: string;
  status: TrackedOrderStatus;
  items: TrackedOrderItem[];
  finalTotal: number | null;
  note?: string;
  pickupInstruction?: string;
  paymentAttempt?: PaymentAttemptStatus;
};

export type OrderTrackingResult =
  | { kind: "missing" }
  | { kind: "unavailable" }
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | { kind: "error" }
  | { kind: "order"; order: TrackedOrder };
