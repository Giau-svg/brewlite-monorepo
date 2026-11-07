import { formatPrice } from "../../lib/format-price";
import { formatAdminDateTime, formatAdminDiscount } from "../../lib/format-admin-promotion";
import { adminPromotionsTheme as theme } from "../../lib/admin-promotions-theme";
import type { AdminPromotion } from "../../types/admin-promotion";

export function AdminPromotionDetail({
  promotion,
  onClose,
  onEdit,
  onToggle,
}: {
  promotion: AdminPromotion;
  onClose: () => void;
  onEdit: (promotion: AdminPromotion) => void;
  onToggle: (promotion: AdminPromotion) => void;
}) {
  return (
    <section className={theme.panel} aria-label={`Chi tiết ${promotion.code}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold">{promotion.code}</h2>
        <p className="rounded-full bg-[#F8F5F0] px-3 py-1 text-sm text-[#67432D]">
          {promotion.isActive ? "Đang bật" : "Đang tắt"}
        </p>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-[#87776B]">Tên</dt><dd>{promotion.name}</dd></div>
        <div><dt className="text-[#87776B]">Loại giảm giá</dt><dd>{promotion.discountType === "PERCENTAGE" ? "Phần trăm" : "Số tiền"}</dd></div>
        <div><dt className="text-[#87776B]">Giá trị giảm</dt><dd>{formatAdminDiscount(promotion.discountType, promotion.discountValue)}</dd></div>
        <div><dt className="text-[#87776B]">Đơn tối thiểu</dt><dd>{formatPrice(promotion.minOrderValue)}đ</dd></div>
        <div><dt className="text-[#87776B]">Giảm tối đa</dt><dd>{promotion.maxDiscount === null ? "Không áp dụng" : `${formatPrice(promotion.maxDiscount)}đ`}</dd></div>
        <div><dt className="text-[#87776B]">Bắt đầu</dt><dd>{formatAdminDateTime(promotion.startsAt)}</dd></div>
        <div><dt className="text-[#87776B]">Kết thúc</dt><dd>{formatAdminDateTime(promotion.endsAt)}</dd></div>
        <div><dt className="text-[#87776B]">Lượt sử dụng</dt><dd>Đã dùng {promotion.usedCount} / {promotion.usageLimit}</dd></div>
      </dl>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => onEdit(promotion)} className={theme.secondary}>Sửa</button>
        <button type="button" onClick={() => onToggle(promotion)} className={theme.secondary}>
          {promotion.isActive ? "Tắt" : "Bật"}
        </button>
        <button type="button" onClick={onClose} className={theme.secondary}>Đóng</button>
      </div>
    </section>
  );
}
