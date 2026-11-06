import Link from "next/link";
import { formatPrice } from "../../lib/format-price";
import { paymentResultTheme as theme } from "../../lib/payment-result-theme";
import type { PaymentOutcome } from "../../types/payment-result";

function formatPaidAt(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function PaymentResultStatus({
  outcome,
  retryMessage,
  onCheckAgain,
  onRetryPayment,
}: {
  outcome: PaymentOutcome | { kind: "loading" };
  retryMessage: string;
  onCheckAgain: () => void;
  onRetryPayment: () => void;
}) {
  if (outcome.kind === "loading") {
    return (
      <section className={theme.panel}>
        <p role="status" className={theme.muted}>Đang kiểm tra kết quả thanh toán...</p>
      </section>
    );
  }

  if (outcome.kind === "error") {
    return (
      <section className={theme.panel}>
        <h2 className={theme.heading}>Chưa kiểm tra được</h2>
        <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
          Không kiểm tra được kết quả thanh toán. Vui lòng thử lại.
        </p>
        <button type="button" onClick={onCheckAgain} className={`${theme.primary} mt-4`}>
          Kiểm tra lại
        </button>
      </section>
    );
  }

  if (outcome.kind === "missing") {
    return (
      <section className={theme.panel}>
        <h2 className={theme.heading}>Chưa có kết quả thanh toán</h2>
        <p role="status" className={theme.muted}>
          Chưa có thông tin giao dịch để hiển thị. Trang này chỉ hiện kết quả sau khi thanh toán được xác nhận.
        </p>
      </section>
    );
  }

  if (outcome.kind === "pending") {
    return (
      <section className={theme.panel}>
        <h2 className={`${theme.heading} ${theme.pending}`}>Đang chờ xác nhận</h2>
        <p role="status" className={theme.muted}>
          Giao dịch đang chờ xác nhận. Kết quả này chưa phải là thanh toán không thành công.
        </p>
      </section>
    );
  }

  if (outcome.kind === "failed") {
    return (
      <section className={theme.panel}>
        <h2 className={`${theme.heading} ${theme.failure}`}>Thanh toán chưa hoàn tất</h2>
        <p role="alert" className="mt-3 text-sm leading-6 text-red-700">{outcome.message}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/checkout" className={theme.primary}>Quay lại thanh toán</Link>
          {outcome.retrySupported && (
            <button type="button" onClick={onRetryPayment} className={theme.secondary}>
              Thử lại
            </button>
          )}
        </div>
        {retryMessage && (
          <p role="status" className="mt-4 text-sm leading-6 text-[#67432D]">{retryMessage}</p>
        )}
      </section>
    );
  }

  const { payment } = outcome;
  return (
    <section className={theme.panel}>
      <h2 className={`${theme.heading} ${theme.success}`}>Thanh toán đã được xác nhận</h2>
      <dl className="mt-4 space-y-3">
        <div className={theme.row}>
          <dt className="text-[#87776B]">Mã đơn</dt>
          <dd className="font-semibold">{payment.orderCode}</dd>
        </div>
        <div className={theme.row}>
          <dt className="text-[#87776B]">Mã giao dịch</dt>
          <dd className="text-right font-medium">{payment.transactionRef}</dd>
        </div>
        <div className={theme.row}>
          <dt className="text-[#87776B]">Số tiền</dt>
          <dd className="font-semibold">{formatPrice(payment.amount)}đ</dd>
        </div>
        <div className={theme.row}>
          <dt className="text-[#87776B]">Thời điểm</dt>
          <dd>{formatPaidAt(payment.paidAt)}</dd>
        </div>
        <div className={theme.row}>
          <dt className="text-[#87776B]">Cách thanh toán</dt>
          <dd>{payment.methodLabel}</dd>
        </div>
      </dl>
      <Link href={`/orders/${payment.orderId}`} className={`${theme.primary} mt-5`}>
        Xem đơn hàng
      </Link>
    </section>
  );
}
