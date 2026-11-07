import type { AdminProductDraft } from "../types/admin-product";

export function validateAdminProductDraft(draft: AdminProductDraft): string | null {
  if (!draft.name.trim()) return "Vui lòng nhập tên sản phẩm.";
  if (!Number.isInteger(draft.basePrice) || draft.basePrice < 0) return "Giá gốc phải là số tiền nguyên, từ 0 trở lên.";
  if (draft.sizes.length === 0 || draft.sizes.some((size) => !size.name.trim())) return "Mỗi sản phẩm cần ít nhất một size có tên.";
  if (draft.sizes.some((size) => !Number.isInteger(size.extraPrice) || size.extraPrice < 0)) {
    return "Giá cộng thêm của size phải là số tiền nguyên, từ 0 trở lên.";
  }
  return null;
}
