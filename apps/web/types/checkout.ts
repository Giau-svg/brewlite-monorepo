export type CheckoutIdentity = {
  userId?: string;
  sessionId?: string;
};

export type CartProduct = {
  id?: string;
  name?: string;
};

/** Giỏ hàng Backend hiện chỉ lưu productId, quantity và note. */
export type CartItem = {
  id?: string;
  productId: string;
  quantity: number;
  note?: string | null;
  product?: CartProduct | null;
  sizeId?: string;
  toppingIds?: string[];
};

export type CartResponse = {
  id: string | null;
  items: CartItem[];
};

export type QuoteRequestItem = {
  productId: string;
  quantity: number;
  note?: string;
  sizeId?: string;
  toppingIds?: string[];
};

export type CalculateQuoteRequest = {
  items: QuoteRequestItem[];
  couponCode?: string;
  pointsUsed?: number;
  userId?: string;
};

export type QuoteTopping = {
  name?: string;
  price?: number;
};

export type QuoteItem = {
  productId?: string;
  productName?: string;
  sizeName?: string;
  unitPrice?: number;
  quantity?: number;
  toppings?: QuoteTopping[];
  lineTotal?: number;
  note?: string;
};

export type AppliedCoupon = {
  code: string;
  discountType?: string;
  discountValue?: number;
};

/**
 * null nghĩa là Backend không trả trường đó.
 * Không gán 0 để tránh biến dữ liệu thiếu thành một số tiền chính thức.
 */
export type QuoteResponse = {
  items: QuoteItem[];
  subtotal: number | null;
  discountAmount: number | null;
  pointsUsed: number | null;
  pointsDiscount: number | null;
  finalTotal: number | null;
  appliedCoupon: AppliedCoupon | null;
};

export type SimulatedPaymentMethod = "WALLET" | "CARD";
