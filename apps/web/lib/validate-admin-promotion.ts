import type { AdminPromotionDraft } from "../types/admin-promotion";

export function validateAdminPromotionDraft(draft: AdminPromotionDraft): string | null {
  if (!draft.code.trim()) return "Vui lòng nhập mã khuyến mãi.";
  if (/\s/.test(draft.code)) return "Mã khuyến mãi không chứa khoảng trắng.";
  if (!draft.name.trim()) return "Vui lòng nhập tên khuyến mãi.";
  if (draft.discountType === "PERCENTAGE") {
    if (!Number.isInteger(draft.discountValue) || draft.discountValue < 1 || draft.discountValue > 50) {
      return "Phần trăm giảm phải là số nguyên từ 1 đến 50.";
    }
  } else if (!Number.isInteger(draft.discountValue) || draft.discountValue < 1) {
    return "Số tiền giảm phải là số nguyên từ 1 trở lên.";
  }
  if (!Number.isInteger(draft.minOrderValue) || draft.minOrderValue < 0) {
    return "Giá trị đơn tối thiểu phải là số tiền nguyên, từ 0 trở lên.";
  }
  if (draft.maxDiscount !== null && (!Number.isInteger(draft.maxDiscount) || draft.maxDiscount < 1)) {
    return "Giảm tối đa phải là số tiền nguyên, từ 1 trở lên.";
  }
  const startsAt = new Date(draft.startsAt).getTime();
  const endsAt = new Date(draft.endsAt).getTime();
  if (!draft.startsAt || !draft.endsAt || Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
    return "Vui lòng chọn thời gian bắt đầu và kết thúc.";
  }
  if (startsAt >= endsAt) return "Thời gian bắt đầu phải trước thời gian kết thúc.";
  if (!Number.isInteger(draft.usageLimit) || draft.usageLimit < 1) {
    return "Giới hạn lượt sử dụng phải là số nguyên từ 1 trở lên.";
  }
  return null;
}
