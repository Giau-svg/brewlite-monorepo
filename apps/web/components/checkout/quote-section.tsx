import type { FormEvent } from "react";
import { formatPrice } from "../../lib/format-price";
import type { QuoteItem, QuoteResponse } from "../../types/checkout";

function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Chưa có thông tin";
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(amount)) return "Chưa có thông tin";
  return `${formatPrice(amount)}đ`;
}

function QuoteLine({ item, index }: { item: QuoteItem; index: number }) {
  const toppings = Array.isArray(item.toppings) ? item.toppings : null;
  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">
          {item.productName?.trim() || "Không có tên trong báo giá"}
        </h3>
        <p className="shrink-0 text-sm font-medium">{formatMoney(item.lineTotal)}</p>
      </div>
      <p className="mt-1 text-sm text-[#87776B]">Size: {item.sizeName?.trim() || "Không có size trong báo giá"}</p>
      <p className="mt-1 text-sm text-[#87776B]">
        Số lượng: {typeof item.quantity === "number" ? item.quantity : "Không có số lượng trong báo giá"}
      </p>
      {toppings === null ? (
        <p className="mt-1 text-sm text-[#87776B]">Không có topping trong báo giá.</p>
      ) : toppings.length === 0 ? (
        <p className="mt-1 text-sm text-[#87776B]">Không có topping.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {toppings.map((topping, toppingIndex) => (
            <li key={`${item.productId ?? index}-topping-${toppingIndex}`}>
              {topping.name?.trim() || "Topping không có tên"}: {formatMoney(topping.price)}
            </li>
          ))}
        </ul>
      )}
      {item.note?.trim() && <p className="mt-1 text-sm text-[#87776B]">Ghi chú: {item.note}</p>}
    </li>
  );
}

export function QuoteSection({
  couponCode,
  pointsInput,
  canCalculate,
  calculating,
  error,
  quote,
  pointsNeedUser,
  onCouponChange,
  onPointsChange,
  onCalculate,
}: {
  couponCode: string;
  pointsInput: string;
  canCalculate: boolean;
  calculating: boolean;
  error: string;
  quote: QuoteResponse | null;
  pointsNeedUser: boolean;
  onCouponChange: (value: string) => void;
  onPointsChange: (value: string) => void;
  onCalculate: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCalculate();
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Báo giá</h2>
      <p className="mt-2 text-sm leading-6 text-[#87776B]">
        Tạm tính, số tiền giảm và số tiền cần trả được lấy từ báo giá.
      </p>
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <div>
          <label htmlFor="checkout-coupon" className="mb-2 block text-sm font-medium">
            Mã giảm giá
          </label>
          <input
            id="checkout-coupon"
            name="couponCode"
            value={couponCode}
            onChange={(event) => onCouponChange(event.target.value)}
            placeholder="Nhập mã nếu có"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-[#DED3C8] px-4 text-sm outline-none focus:border-[#67432D] focus:ring-2 focus:ring-[#67432D]/15"
          />
        </div>
        <div>
          <label htmlFor="checkout-points" className="mb-2 block text-sm font-medium">
            Số điểm muốn sử dụng
          </label>
          <input
            id="checkout-points"
            name="pointsUsed"
            inputMode="numeric"
            value={pointsInput}
            onChange={(event) => onPointsChange(event.target.value)}
            placeholder="0"
            className="h-12 w-full rounded-xl border border-[#DED3C8] px-4 text-sm outline-none focus:border-[#67432D] focus:ring-2 focus:ring-[#67432D]/15"
          />
          {pointsNeedUser && (
            <p className="mt-2 text-sm leading-6 text-[#87776B]">
              Điểm thưởng chỉ dùng được khi bạn đăng nhập bằng tài khoản.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!canCalculate || calculating}
          className="h-12 w-full rounded-xl bg-[#67432D] text-sm font-semibold text-white transition-colors hover:bg-[#543622] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67432D] disabled:cursor-not-allowed disabled:bg-[#C9B8A8]"
        >
          {calculating ? "Đang lấy báo giá..." : "Lấy báo giá"}
        </button>
      </form>

      {calculating && (
        <p role="status" className="mt-4 text-sm text-[#87776B]">
          Đang lấy báo giá...
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}

      {quote && (
        <div className="mt-5 border-t border-[#EFE5D8] pt-4">
          <h3 className="font-semibold">Chi tiết báo giá</h3>
          <ul className="divide-y divide-[#EFE5D8]">
            {quote.items.map((item, index) => (
              <QuoteLine key={`${item.productId ?? "item"}-${index}`} item={item} index={index} />
            ))}
          </ul>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Tổng tạm tính</dt>
              <dd>{formatMoney(quote.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Số tiền giảm</dt>
              <dd>{formatMoney(quote.discountAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Điểm đã dùng</dt>
              <dd>{quote.pointsUsed === null ? "Chưa có thông tin" : quote.pointsUsed}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Số tiền giảm từ điểm</dt>
              <dd>{formatMoney(quote.pointsDiscount)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-base font-bold">
              <dt>Tổng phải thanh toán</dt>
              <dd>{formatMoney(quote.finalTotal)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-[#87776B]">
            {quote.appliedCoupon
              ? `Mã đã áp dụng: ${quote.appliedCoupon.code}`
              : "Chưa áp dụng mã giảm giá."}
          </p>
        </div>
      )}
    </section>
  );
}
