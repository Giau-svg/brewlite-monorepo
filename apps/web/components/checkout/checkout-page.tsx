"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkoutErrorMessage } from "../../lib/checkout-api-error";
import { getCheckoutIdentity, hasCheckoutIdentity } from "../../lib/checkout-identity";
import { buildCalculateRequest, calculateQuote, getCart } from "../../services/cart.service";
import type { CartResponse, QuoteResponse, SimulatedPaymentMethod } from "../../types/checkout";
import { CartSection } from "./cart-section";
import { PaymentSection } from "./payment-section";
import { QuoteSection } from "./quote-section";

const ORDER_UNAVAILABLE_MESSAGE =
  "Chưa thể hoàn tất đặt hàng lúc này. Đơn hàng chưa được tạo và bạn chưa bị trừ tiền.";

type RemoteCartState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; cart: CartResponse };

export function CheckoutPage() {
  const [attempt, setAttempt] = useState(0);
  const [remoteCart, setRemoteCart] = useState<RemoteCartState>({ status: "loading" });
  const [couponCode, setCouponCode] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<SimulatedPaymentMethod>("WALLET");
  const [orderNotice, setOrderNotice] = useState("");
  const identity = getCheckoutIdentity();
  const identified = hasCheckoutIdentity(identity);
  const userId = identified ? identity.userId?.trim() || undefined : undefined;
  const sessionId = identified ? identity.sessionId?.trim() || undefined : undefined;
  const cartState = identified ? remoteCart : { status: "missing-identity" as const };

  useEffect(() => {
    if (!userId && !sessionId) return;
    let active = true;
    getCart({ userId, sessionId })
      .then((cart) => {
        if (active) setRemoteCart({ status: "ready", cart });
      })
      .catch((error: unknown) => {
        if (active) setRemoteCart({ status: "error", message: checkoutErrorMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [attempt, userId, sessionId]);

  async function requestQuote() {
    if (cartState.status !== "ready") return;
    let request: ReturnType<typeof buildCalculateRequest>;
    try {
      request = buildCalculateRequest({
        items: cartState.cart.items,
        couponCode,
        pointsInput,
        userId,
      });
    } catch (error) {
      setQuote(null);
      setQuoteError(checkoutErrorMessage(error));
      return;
    }
    if ("error" in request) {
      setQuote(null);
      setQuoteError(request.error);
      return;
    }

    setCalculating(true);
    setQuote(null);
    setQuoteError("");
    setOrderNotice("");
    try {
      setQuote(await calculateQuote(request));
    } catch (error) {
      setQuoteError(checkoutErrorMessage(error));
    } finally {
      setCalculating(false);
    }
  }

  function retry() {
    setRemoteCart({ status: "loading" });
    setQuote(null);
    setQuoteError("");
    setOrderNotice("");
    setAttempt((value) => value + 1);
  }

  const ready = cartState.status === "ready";
  const hasItems = ready && cartState.cart.items.length > 0;
  const hasValidQuote = Boolean(
    quote &&
    quote.items.length > 0 &&
    typeof quote.finalTotal === "number" &&
    Number.isFinite(quote.finalTotal),
  );
  const canPlaceOrder = hasItems && hasValidQuote;

  function placeOrder() {
    if (!canPlaceOrder) return;
    setOrderNotice(ORDER_UNAVAILABLE_MESSAGE);
  }

  return (
    <main className="min-h-screen bg-[#F8F5F0] px-4 py-6 text-[#32251D] sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div>
          <Link href="/" className="text-sm font-medium text-[#67432D] hover:underline">
            Về trang chủ
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Thanh toán</h1>
          <p className="mt-2 text-sm leading-6 text-[#87776B]">
            Xem giỏ hàng và lấy báo giá chính thức trước khi đặt món.
          </p>
        </div>

        {cartState.status === "loading" && (
          <p role="status" className="rounded-2xl bg-white px-5 py-4 text-sm text-[#87776B] shadow-sm">
            Đang tải giỏ hàng...
          </p>
        )}

        {cartState.status === "missing-identity" && (
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p role="status" className="text-sm leading-6 text-[#67432D]">
              Vui lòng đăng nhập để tiếp tục thanh toán
            </p>
            <Link href="/login" className="mt-3 inline-block text-sm font-semibold text-[#67432D] hover:underline">
              Đăng nhập
            </Link>
          </div>
        )}

        {cartState.status === "error" && (
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p role="alert" className="text-sm leading-6 text-red-700">{cartState.message}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 h-11 rounded-xl bg-[#67432D] px-5 text-sm font-semibold text-white hover:bg-[#543622] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67432D]"
            >
              Thử tải lại
            </button>
          </div>
        )}

        {ready && <CartSection items={cartState.cart.items} />}

        <QuoteSection
          couponCode={couponCode}
          pointsInput={pointsInput}
          canCalculate={hasItems}
          calculating={calculating}
          error={quoteError}
          quote={quote}
          pointsNeedUser={ready && !userId}
          onCouponChange={setCouponCode}
          onPointsChange={setPointsInput}
          onCalculate={() => {
            void requestQuote();
          }}
          />

        <PaymentSection
          method={paymentMethod}
          notice={orderNotice}
          canPlaceOrder={canPlaceOrder}
          onMethodChange={setPaymentMethod}
          onPlaceOrder={placeOrder}
        />
      </div>
    </main>
  );
}
