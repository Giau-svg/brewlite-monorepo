import type { SimulatedPaymentMethod } from "../../types/checkout";

const METHODS: Array<{ value: SimulatedPaymentMethod; label: string; description: string }> = [
  {
    value: "WALLET",
    label: "Ví mô phỏng",
    description: "Dùng số dư ví khi hoàn tất đơn.",
  },
  {
    value: "CARD",
    label: "Thẻ mô phỏng",
    description: "Dùng thẻ khi hoàn tất đơn.",
  },
];

export function PaymentSection({
  method,
  notice,
  canPlaceOrder,
  onMethodChange,
  onPlaceOrder,
}: {
  method: SimulatedPaymentMethod;
  notice: string;
  canPlaceOrder: boolean;
  onMethodChange: (method: SimulatedPaymentMethod) => void;
  onPlaceOrder: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Thanh toán</h2>
      <p className="mt-2 text-sm leading-6 text-[#87776B]">
        Chọn ví hoặc thẻ trước khi đặt hàng.
      </p>
      <fieldset className="mt-4 space-y-3">
        <legend className="sr-only">Cách thanh toán</legend>
        {METHODS.map((option) => (
          <div key={option.value} className="rounded-xl border border-[#DED3C8] p-4 has-[:checked]:border-[#67432D] has-[:checked]:bg-[#F8F5F0]">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
              <input
                type="radio"
                name="payment-method"
                value={option.value}
                checked={method === option.value}
                onChange={() => onMethodChange(option.value)}
                className="accent-[#67432D]"
              />
              {option.label}
            </label>
            <p className="mt-1 pl-7 text-sm leading-6 text-[#87776B]">{option.description}</p>
          </div>
        ))}
      </fieldset>
      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={!canPlaceOrder}
        className="mt-4 h-12 w-full rounded-xl bg-[#32251D] text-sm font-semibold text-white transition-colors hover:bg-[#543622] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67432D] disabled:cursor-not-allowed disabled:bg-[#C9B8A8]"
      >
        Đặt hàng
      </button>
      {notice && (
        <p role="status" className="mt-4 rounded-xl bg-[#F8F5F0] px-3 py-3 text-sm leading-6 text-[#67432D]">
          {notice}
        </p>
      )}
    </section>
  );
}
