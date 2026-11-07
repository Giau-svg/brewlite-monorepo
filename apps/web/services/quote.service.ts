import { authHttp, authError } from "./auth.service";
import { apiUrl } from "./product.service";
import type { CartLine } from "../lib/cart-config";

export type QuoteLine = {
  productName: string;
  sizeName: string;
  quantity: number;
  lineTotal: string;
  toppings: { name: string; price: string }[];
};

export type PriceQuote = {
  items: QuoteLine[];
  subtotal: string;
  discountAmount: string;
  pointsDiscount: string;
  finalTotal: string;
  quoteFingerprint: string;
};

function isNumber(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(0|[1-9][0-9]*)$/.test(value) &&
    Number.isSafeInteger(Number(value))
  );
}

function isQuote(value: unknown): value is PriceQuote {
  if (typeof value !== "object" || value === null) return false;
  const quote = value as Record<string, unknown>;
  return (
    Array.isArray(quote.items) &&
    isNumber(quote.subtotal) &&
    isNumber(quote.discountAmount) &&
    isNumber(quote.pointsDiscount) &&
    isNumber(quote.finalTotal) &&
    typeof quote.quoteFingerprint === "string"
  );
}

export async function readApiMessage(response: Response) {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "message" in data) {
      const message = (data as { message: unknown }).message;
      if (typeof message === "string") return message;
      if (
        Array.isArray(message) &&
        message.every((item) => typeof item === "string")
      ) {
        return message.join(" ");
      }
    }
  } catch {
    /* Keep the generic message when the body is not JSON. */
  }
  return "Máy chủ không tính được giá. Vui lòng thử lại.";
}

export async function calculateQuote(
  lines: CartLine[],
  couponCode?: string,
  pointsUsed = 0,
): Promise<PriceQuote> {
  try {
    const response = await authHttp.post<unknown>(apiUrl("/cart/calculate"), {
      items: lines.map((line) => ({
        productId: line.productId,
        sizeId: line.sizeId ?? undefined,
        toppingIds: line.toppings.map((item) => item.id),
        quantity: line.quantity,
        note: line.note || undefined,
      })),
      couponCode: couponCode?.trim() || undefined,
      pointsUsed,
    });
    if (!isQuote(response.data))
      throw new Error("Phản hồi giá không đúng định dạng.");
    return response.data;
  } catch (error) {
    throw new Error(authError(error));
  }
}
