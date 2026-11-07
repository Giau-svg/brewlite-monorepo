export type AdminDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type AdminPromotion = {
  id: string;
  code: string;
  name: string;
  discountType: AdminDiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  startsAt: string;
  endsAt: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
};

export type AdminPromotionDraft = {
  code: string;
  name: string;
  discountType: AdminDiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  startsAt: string;
  endsAt: string;
  usageLimit: number;
  isActive: boolean;
};

export type AdminPromotionListResult =
  | { kind: "ready"; promotions: AdminPromotion[] }
  | { kind: "unavailable" }
  | { kind: "error" };

export type AdminPromotionMutation =
  | { ok: true; promotion: AdminPromotion }
  | { ok: false; message: string };
