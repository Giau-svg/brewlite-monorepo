import { STAFF_ORDER_FLOW, type StaffOrderStatus } from "../types/staff-order";

const STEP_LABELS: Record<StaffOrderStatus, string> = {
  PAID: "Đã thanh toán",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng",
  COMPLETED: "Đã hoàn tất",
};

const ACTION_LABELS: Record<Exclude<StaffOrderStatus, "COMPLETED">, string> = {
  PAID: "Bắt đầu chuẩn bị",
  PREPARING: "Đánh dấu sẵn sàng",
  READY: "Đánh dấu đã giao",
};

export function staffStatusLabel(status: StaffOrderStatus): string {
  return STEP_LABELS[status];
}

export function nextStaffStatus(status: StaffOrderStatus): StaffOrderStatus | null {
  const index = STAFF_ORDER_FLOW.indexOf(status);
  if (index < 0 || index === STAFF_ORDER_FLOW.length - 1) return null;
  return STAFF_ORDER_FLOW[index + 1];
}

/** Chỉ một bước kế tiếp. Không nhảy trạng thái và không quay lui. */
export function canAdvanceStaffOrder(from: StaffOrderStatus, to: StaffOrderStatus): boolean {
  return nextStaffStatus(from) === to;
}

export function staffAdvanceLabel(status: StaffOrderStatus): string | null {
  if (status === "COMPLETED") return null;
  return ACTION_LABELS[status];
}
