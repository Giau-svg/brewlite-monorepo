export const STAFF_ORDER_FLOW = ["PAID", "PREPARING", "READY", "COMPLETED"] as const;

export type StaffOrderStatus = (typeof STAFF_ORDER_FLOW)[number];

export type StaffOrderFilter = "ALL" | StaffOrderStatus;

export type StaffOrderItem = {
  name: string;
  quantity: number;
  sizeName?: string;
  note?: string;
  toppings: string[];
};

export type StaffOrder = {
  id: string;
  orderCode: string;
  status: StaffOrderStatus;
  placedAt?: string;
  items: StaffOrderItem[];
  finalTotal: number | null;
};

export type StaffBoard =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "forbidden" }
  | { kind: "error" }
  | { kind: "ready"; orders: StaffOrder[]; canUpdate: boolean };

export type StaffUpdateResult =
  | { accepted: true; order: StaffOrder }
  | { accepted: false; reason: "unavailable" | "forbidden" | "conflict" | "rejected" | "error" };
