import { formatPrice } from "./format-price";
import type { AdminDiscountType } from "../types/admin-promotion";

export function formatAdminDiscount(discountType: AdminDiscountType, discountValue: number): string {
  if (discountType === "PERCENTAGE") return `${discountValue}%`;
  return `${formatPrice(discountValue)}đ`;
}

export function formatAdminDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
