import type {
  AdminPromotionDraft,
  AdminPromotionListResult,
  AdminPromotionMutation,
} from "../types/admin-promotion";

const unavailableChange = "Chưa thể lưu thay đổi lúc này.";

/**
 * Điểm tích hợp quản lý khuyến mãi.
 * SRS ghi nhóm `/admin/promotions` cho chủ cửa hàng. Đường dẫn dự kiến của ứng dụng là
 * `/api/admin/promotions`, nhưng Backend chưa có endpoint và chưa chốt schema JSON.
 * Hàm không gọi mạng và không đọc dữ liệu mẫu.
 * Khi API sẵn sàng, gọi đường dẫn đó bằng phiên chủ cửa hàng, map đúng JSON đã thống nhất,
 * và chỉ trả `kind: "ready"` hoặc `ok: true` khi máy chủ xác nhận. Lỗi mạng trả `error`,
 * không thay bằng dữ liệu mẫu.
 */
export async function loadAdminPromotions(): Promise<AdminPromotionListResult> {
  return { kind: "unavailable" };
}

export async function createAdminPromotion(draft: AdminPromotionDraft): Promise<AdminPromotionMutation> {
  void draft;
  return { ok: false, message: unavailableChange };
}

export async function updateAdminPromotion(id: string, draft: AdminPromotionDraft): Promise<AdminPromotionMutation> {
  void id;
  void draft;
  return { ok: false, message: unavailableChange };
}

export async function setAdminPromotionActive(id: string, isActive: boolean): Promise<AdminPromotionMutation> {
  void id;
  void isActive;
  return { ok: false, message: unavailableChange };
}
