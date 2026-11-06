import { readCheckoutError, CheckoutApiError } from "../lib/checkout-api-error";
import type {
  CalculateQuoteRequest,
  CartItem,
  CartResponse,
  CheckoutIdentity,
  QuoteItem,
  QuoteResponse,
} from "../types/checkout";

function apiBase(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  return baseUrl.replace(/\/+$/, "");
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseCartItem(value: unknown, index: number): CartItem {
  if (!value || typeof value !== "object") {
    throw new CheckoutApiError("Dữ liệu giỏ hàng không đúng định dạng.");
  }
  const item = value as Record<string, unknown>;
  const productId = optionalString(item.productId);
  if (!productId) {
    throw new CheckoutApiError(`Món thứ ${index + 1} trong giỏ hàng thiếu mã sản phẩm.`);
  }
  if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity)) {
    throw new CheckoutApiError(`Món thứ ${index + 1} trong giỏ hàng thiếu số lượng hợp lệ.`);
  }

  const product = item.product;
  const parsed: CartItem = {
    productId,
    quantity: item.quantity,
  };
  if (typeof item.id === "string") parsed.id = item.id;
  if (typeof item.note === "string" || item.note === null) parsed.note = item.note;
  if (product && typeof product === "object") {
    const record = product as Record<string, unknown>;
    parsed.product = {
      id: typeof record.id === "string" ? record.id : undefined,
      name: typeof record.name === "string" ? record.name : undefined,
    };
  }
  const sizeId = optionalString(item.sizeId);
  if (sizeId) parsed.sizeId = sizeId;
  if (Array.isArray(item.toppingIds) && item.toppingIds.every((id) => typeof id === "string")) {
    parsed.toppingIds = item.toppingIds;
  }
  return parsed;
}

export function parseCartResponse(data: unknown): CartResponse {
  if (!data || typeof data !== "object") {
    throw new CheckoutApiError("Dữ liệu giỏ hàng không đúng định dạng.");
  }
  const body = data as { id?: unknown; items?: unknown };
  if (!Array.isArray(body.items)) {
    throw new CheckoutApiError("Dữ liệu giỏ hàng không đúng định dạng.");
  }
  return {
    id: typeof body.id === "string" ? body.id : null,
    items: body.items.map(parseCartItem),
  };
}

function money(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  throw new CheckoutApiError("Báo giá có số tiền không hợp lệ.");
}

function parseQuoteItem(value: unknown): QuoteItem {
  if (!value || typeof value !== "object") {
    throw new CheckoutApiError("Dữ liệu báo giá không đúng định dạng.");
  }
  const item = value as QuoteItem;
  const toppings = Array.isArray(item.toppings) ? item.toppings : undefined;
  return {
    productId: item.productId,
    productName: item.productName,
    sizeName: item.sizeName,
    unitPrice: item.unitPrice === undefined ? undefined : money(item.unitPrice) ?? undefined,
    quantity: item.quantity,
    toppings,
    lineTotal: item.lineTotal === undefined ? undefined : money(item.lineTotal) ?? undefined,
    note: item.note,
  };
}

export function parseQuoteResponse(data: unknown): QuoteResponse {
  if (!data || typeof data !== "object") {
    throw new CheckoutApiError("Dữ liệu báo giá không đúng định dạng.");
  }
  const body = data as Record<string, unknown>;
  if (!Array.isArray(body.items)) {
    throw new CheckoutApiError("Dữ liệu báo giá không đúng định dạng.");
  }

  let appliedCoupon: QuoteResponse["appliedCoupon"] = null;
  if (body.appliedCoupon && typeof body.appliedCoupon === "object") {
    const coupon = body.appliedCoupon as { code?: unknown; discountType?: unknown; discountValue?: unknown };
    if (typeof coupon.code === "string" && coupon.code.trim()) {
      appliedCoupon = {
        code: coupon.code,
        discountType: typeof coupon.discountType === "string" ? coupon.discountType : undefined,
        discountValue: coupon.discountValue === undefined ? undefined : money(coupon.discountValue) ?? undefined,
      };
    }
  } else if (typeof body.couponCode === "string" && body.couponCode.trim()) {
    appliedCoupon = { code: body.couponCode };
  }

  return {
    items: body.items.map(parseQuoteItem),
    subtotal: money(body.subtotal),
    discountAmount: money(body.discountAmount),
    pointsUsed: body.pointsUsed === undefined ? null : money(body.pointsUsed),
    pointsDiscount: money(body.pointsDiscount),
    finalTotal: money(body.finalTotal),
    appliedCoupon,
  };
}

export function buildCalculateRequest(input: {
  items: CartItem[];
  couponCode: string;
  pointsInput: string;
  userId?: string;
}): CalculateQuoteRequest | { error: string } {
  if (input.items.length === 0) {
    return { error: "Giỏ hàng đang trống nên chưa thể lấy báo giá." };
  }

  const points = input.pointsInput.trim();
  let pointsUsed: number | undefined;
  if (points !== "") {
    if (!/^\d+$/.test(points)) {
      return { error: "Số điểm phải là số nguyên lớn hơn hoặc bằng 0." };
    }
    pointsUsed = Number(points);
  }

  const items = input.items.map((item, index) => {
    if (!item.productId.trim()) {
      throw new CheckoutApiError(`Món thứ ${index + 1} trong giỏ hàng thiếu mã sản phẩm.`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new CheckoutApiError(`Món thứ ${index + 1} trong giỏ hàng thiếu số lượng hợp lệ.`);
    }
    const line: CalculateQuoteRequest["items"][number] = {
      productId: item.productId,
      quantity: item.quantity,
    };
    if (typeof item.note === "string" && item.note.trim()) line.note = item.note;
    if (item.sizeId) line.sizeId = item.sizeId;
    if (item.toppingIds && item.toppingIds.length > 0) line.toppingIds = item.toppingIds;
    return line;
  });

  const request: CalculateQuoteRequest = { items };
  const couponCode = input.couponCode.trim();
  if (couponCode) request.couponCode = couponCode;
  if (pointsUsed !== undefined) request.pointsUsed = pointsUsed;
  if (input.userId?.trim()) request.userId = input.userId.trim();
  return request;
}

export async function getCart(identity: CheckoutIdentity): Promise<CartResponse> {
  const params = new URLSearchParams();
  if (identity.userId?.trim()) params.set("userId", identity.userId.trim());
  else if (identity.sessionId?.trim()) params.set("sessionId", identity.sessionId.trim());
  else throw new CheckoutApiError("Vui lòng đăng nhập để tiếp tục thanh toán.");

  const response = await fetch(`${apiBase()}/api/cart?${params.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw await readCheckoutError(response);
  return parseCartResponse(await response.json());
}

export async function calculateQuote(request: CalculateQuoteRequest): Promise<QuoteResponse> {
  const response = await fetch(`${apiBase()}/api/cart/calculate`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw await readCheckoutError(response);
  return parseQuoteResponse(await response.json());
}
