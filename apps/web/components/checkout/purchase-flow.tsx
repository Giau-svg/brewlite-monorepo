"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendStore, type Order } from "../../services/store.service";
import LoginForm from "../auth/login-form";
import { CenteredDialog } from "../ui/centered-dialog";
import {
  currentUser,
  authError,
  type AuthUser,
} from "../../services/auth.service";
import { calculateQuote, type PriceQuote } from "../../services/quote.service";
import { formatPrice } from "../../lib/format-price";
import { useCart } from "../cart/cart-provider";

export function PurchaseFlow({ onClose }: { onClose: () => void }) {
  const { lines, subtotal, version, ready, reload, canCheckout } = useCart();
  const router = useRouter();
  const orderKey = useRef(crypto.randomUUID());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [coupon, setCoupon] = useState("");
  const [points, setPoints] = useState(0);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    quote: PriceQuote;
    lines: typeof lines;
    coupon: string;
    points: number;
  } | null>(null);
  const quote =
    result &&
    result.lines === lines &&
    result.coupon === coupon &&
    result.points === points
      ? result.quote
      : null;
  useEffect(() => {
    let active = true;
    currentUser()
      .then((next) => {
        if (active) setUser(next);
      })
      .catch((error) => {
        if (active) setMessage(authError(error));
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  if (checking)
    return (
      <CenteredDialog label="Kiểm tra đăng nhập" onClose={onClose}>
        <p className="purchase-panel" role="status">
          Đang kiểm tra đăng nhập…
        </p>
      </CenteredDialog>
    );
  if (!user && !message)
    return <LoginForm onClose={onClose} onSuccess={setUser} />;
  return (
    <CenteredDialog label="Xác nhận mua" onClose={onClose}>
      <div className="purchase-panel">
        <button
          type="button"
          className="purchase-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ×
        </button>
        <h2>Xác nhận mua</h2>
        {user && (
          <>
            <p>
              {user.fullName} · {user.email}
            </p>
            <label htmlFor="purchase-coupon">Mã giảm giá</label>
            <input
              id="purchase-coupon"
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
            />
            <label htmlFor="purchase-points">
              Dùng điểm thưởng (hiện có {user.loyaltyPoints})
            </label>
            <input
              id="purchase-points"
              type="number"
              min={0}
              max={user.loyaltyPoints}
              step={1}
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
            />
            <p>Tạm tính: {formatPrice(subtotal)}đ</p>
            <button
              className="btn btn-espresso"
              type="button"
              disabled={
                pending ||
                !ready ||
                canCheckout === false ||
                !lines.length ||
                !Number.isInteger(points) ||
                points < 0 ||
                points > user.loyaltyPoints
              }
              onClick={async () => {
                setPending(true);
                setMessage("");
                setResult(null);
                orderKey.current = crypto.randomUUID();
                try {
                  setResult({
                    quote: await calculateQuote(lines, coupon, points),
                    lines,
                    coupon,
                    points,
                  });
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Không thể tính tổng đơn.",
                  );
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "Đang tính…" : "Tính lại tổng đơn"}
            </button>
            {quote && (
              <div>
                <p>
                  Giảm giá:{" "}
                  {formatPrice(
                    Number(quote.discountAmount) + Number(quote.pointsDiscount),
                  )}
                  đ
                </p>
                <strong>
                  Tổng thanh toán: {formatPrice(quote.finalTotal)}đ
                </strong>
              </div>
            )}
            {!ready && <p role="status">Đang đồng bộ giỏ hàng PostgreSQL…</p>}
            {quote && (
              <button
                className="btn btn-espresso"
                disabled={pending || !ready || canCheckout === false}
                onClick={async () => {
                  setPending(true);
                  setMessage("");
                  try {
                    const order = await sendStore<Order>(
                      "/orders",
                      {
                        cartVersion: version,
                        couponCode: coupon,
                        pointsUsed: points,
                        quoteFingerprint: quote.quoteFingerprint,
                      },
                      "post",
                      orderKey.current,
                    );
                    await reload();
                    onClose();
                    router.push(`/orders/${order.id}`);
                  } catch (error) {
                    setMessage(authError(error));
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {pending ? "Đang tạo đơn…" : "Xác nhận mua"}
              </button>
            )}
          </>
        )}
        {message && <p role="alert">{message}</p>}
      </div>
    </CenteredDialog>
  );
}
