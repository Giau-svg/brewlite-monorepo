import { apiUrl } from "./product.service";
import type { CartLine } from "../lib/cart-config";

export type QuoteLine = {
  productName: string;
  sizeName: string;
  quantity: number;
  lineTotal: number;
  toppings: { name: string; price: number }[];
};

export type PriceQuote = {
  items: QuoteLine[];
  subtotal: number;
  discountAmount: number;
  pointsDiscount: number;
  finalTotal: number;
};

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isQuote(value: unknown): value is PriceQuote {
  if (typeof value !== "object" || value === null) return false;
  const quote = value as Record<string, unknown>;
  return Array.isArray(quote.items) &&
    isNumber(quote.subtotal) &&
    isNumber(quote.discountAmount) &&
    isNumber(quote.pointsDiscount) &&
    isNumber(quote.finalTotal);
}

export async function readApiMessage(response: Response) {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "message" in data) {
      const message = (data as { message: unknown }).message;
      if (typeof message === "string") return message;
      if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
        return message.join(" ");
      }
    }
  } catch { /* Keep the generic message when the body is not JSON. */ }
  return "Máy chủ không tính được giá. Vui lòng thử lại.";
}

export async function calculateQuote(lines: CartLine[], couponCode?: string): Promise<PriceQuote> {
  const response = await fetch(apiUrl("/cart/calculate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: lines.map((line) => ({
        productId: line.productId,
        sizeId: line.sizeId ?? undefined,
        toppingIds: line.toppings.map((topping) => topping.id),
        quantity: line.quantity,
        note: line.note || undefined,
      })),
      couponCode: couponCode?.trim() || undefined,
    }),
  });
  if (!response.ok) throw new Error(await readApiMessage(response));
  const data: unknown = await response.json();
  if (!isQuote(data)) throw new Error("Phản hồi giá từ máy chủ không đúng định dạng.");
  return data;
}
