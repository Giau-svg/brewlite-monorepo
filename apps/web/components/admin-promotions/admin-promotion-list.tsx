import { formatPrice } from "../../lib/format-price";
import { formatAdminDiscount } from "../../lib/format-admin-promotion";
import { adminPromotionsTheme as theme } from "../../lib/admin-promotions-theme";
import type { AdminPromotion } from "../../types/admin-promotion";

export function AdminPromotionList({
  promotions,
  onView,
  onEdit,
  onToggle,
}: {
  promotions: AdminPromotion[];
  onView: (promotion: AdminPromotion) => void;
  onEdit: (promotion: AdminPromotion) => void;
  onToggle: (promotion: AdminPromotion) => void;
}) {
  return (
    <div className={theme.grid}>
      {promotions.map((promotion) => (
        <article key={promotion.id} className={theme.panel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{promotion.code}</h2>
              <p className="mt-1 text-sm text-[#87776B]">{promotion.name}</p>
            </div>
            <p className="rounded-full bg-[#F8F5F0] px-3 py-1 text-sm text-[#67432D]">
              {promotion.isActive ? "Đang bật" : "Đang tắt"}
            </p>
          </div>
          <p className="mt-3 font-semibold">Giảm {formatAdminDiscount(promotion.discountType, promotion.discountValue)}</p>
          <p className="mt-1 text-sm text-[#87776B]">Đơn tối thiểu {formatPrice(promotion.minOrderValue)}đ</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => onView(promotion)} className={theme.secondary}>Xem chi tiết</button>
            <button type="button" onClick={() => onEdit(promotion)} className={theme.secondary}>Sửa</button>
            <button type="button" onClick={() => onToggle(promotion)} className={theme.secondary}>
              {promotion.isActive ? "Tắt" : "Bật"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
