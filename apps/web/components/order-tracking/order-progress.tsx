import { FULFILLMENT_STEPS, type FulfillmentStatus } from "../../types/order-tracking";
import { orderTrackingTheme as theme } from "../../lib/order-tracking-theme";

const STEP_LABELS: Record<FulfillmentStatus, string> = {
  PAID: "Đã thanh toán",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng",
  COMPLETED: "Đã hoàn tất",
};

export function OrderProgress({ status }: { status: FulfillmentStatus }) {
  const currentIndex = FULFILLMENT_STEPS.indexOf(status);

  return (
    <ol className="mt-4 space-y-3" aria-label="Tiến độ đơn hàng">
      {FULFILLMENT_STEPS.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className={`rounded-xl border border-[#EFE5D8] px-4 py-3 text-sm ${theme[state]}`}
          >
            <span className="block">{STEP_LABELS[step]}</span>
            <span className="mt-1 block text-xs text-[#87776B]">
              {state === "current" ? "Bước hiện tại" : state === "done" ? "Đã qua" : "Chưa tới"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
