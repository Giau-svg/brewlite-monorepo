import type { DecimalPrice } from "../types/product";

export function parsePrice(price: unknown): number {
  if (typeof price !== "number" &&
      !(typeof price === "string" && /^\d+(?:\.\d{1,2})?$/.test(price))) {
    throw new Error("Invalid product price");
  }
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new Error("Invalid product price");
  }
  return value;
}

export function formatPrice(price: DecimalPrice): string {
  return parsePrice(price).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}
