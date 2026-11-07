import type { AdminCatalogResult, AdminProductDraft, AdminProductMutation } from "../types/admin-product";

const unavailableChange = "Chưa thể lưu thay đổi lúc này.";

/**
 * Điểm tích hợp quản lý sản phẩm.
 * SRS ghi nhóm `/admin/products` cho chủ cửa hàng. Đường dẫn dự kiến của ứng dụng là
 * `/api/admin/products`, nhưng Backend chưa có endpoint và chưa chốt schema JSON.
 * Hàm không gọi mạng và không đọc dữ liệu mẫu.
 * Khi API sẵn sàng, gọi đường dẫn đó bằng phiên chủ cửa hàng, map đúng JSON đã thống nhất,
 * và chỉ trả `kind: "ready"` hoặc `ok: true` khi máy chủ xác nhận. Lỗi mạng trả `error`,
 * không thay bằng dữ liệu mẫu.
 */
export async function loadAdminCatalog(): Promise<AdminCatalogResult> {
  return { kind: "unavailable" };
}

export async function createAdminProduct(draft: AdminProductDraft): Promise<AdminProductMutation> {
  void draft;
  return { ok: false, message: unavailableChange };
}

export async function updateAdminProduct(id: string, draft: AdminProductDraft): Promise<AdminProductMutation> {
  void id;
  void draft;
  return { ok: false, message: unavailableChange };
}

export async function setAdminProductAvailability(id: string, isAvailable: boolean): Promise<AdminProductMutation> {
  void id;
  void isAvailable;
  return { ok: false, message: unavailableChange };
}
