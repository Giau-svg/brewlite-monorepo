"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getStore, sendStore, type Order } from "../../services/store.service";
import { authError } from "../../services/auth.service";
import { formatPrice } from "../../lib/format-price";
import { useAuthUser, refreshAuth } from "../../lib/auth-store";
export const statusName: Record<string, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Đang pha chế",
  READY: "Sẵn sàng nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};
export function OrdersView({
  id,
  staff = false,
}: {
  id?: string;
  staff?: boolean;
}) {
  const user = useAuthUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const keys = useRef(new Map<string, string>());
  const endpoint = staff ? "/staff/orders" : id ? `/orders/${id}` : "/orders";
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getStore<Order | Order[]>(endpoint);
        if (active) {
          setOrders(Array.isArray(data) ? data : [data]);
          setError("");
        }
      } catch (e) {
        if (active) setError(authError(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [endpoint, attempt]);
  async function action(
    order: Order,
    name: string,
    body: object,
    method: "post" | "patch" = "post",
  ) {
    const operation = `${order.id}:${order.version}:${name}:${JSON.stringify(body)}`;
    const key = keys.current.get(operation) || crypto.randomUUID();
    keys.current.set(operation, key);
    setPending(true);
    setError("");
    try {
      await sendStore(
        staff
          ? `/staff/orders/${order.id}/status`
          : `/orders/${order.id}/${name}`,
        body,
        method,
        key,
      );
      keys.current.delete(operation);
      setAttempt((a) => a + 1);
      void refreshAuth();
    } catch (e) {
      setError(authError(e));
    } finally {
      setPending(false);
    }
  }
  const next: Record<string, string> = {
    PAID: "PREPARING",
    PREPARING: "READY",
    READY: "COMPLETED",
  };
  return (
    <div className="store-workspace">
      <h1>
        {staff
          ? "Đơn cần phục vụ"
          : id
            ? "Chi tiết đơn hàng"
            : "Lịch sử đơn hàng"}
      </h1>
      {user && (
        <p>
          {user.fullName} · {user.loyaltyPoints} điểm thưởng
        </p>
      )}
      {loading && <p role="status">Đang tải đơn từ máy chủ…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setAttempt((a) => a + 1)}>Thử lại</button>{" "}
          {!user && <Link href="/login">Đăng nhập</Link>}
        </p>
      )}
      {!loading && !error && !orders.length && <p>Chưa có đơn hàng phù hợp.</p>}
      {orders.map((o) => (
        <article className="store-order" key={o.id}>
          <h2>
            <Link href={staff ? "#" : `/orders/${o.id}`}>{o.orderCode}</Link>
          </h2>
          <p>
            <strong>{statusName[o.status] || o.status}</strong> ·{" "}
            {new Date(o.createdAt).toLocaleString("vi-VN")} ·{" "}
            {formatPrice(o.finalTotal)}đ
          </p>
          {(id || staff) && (
            <>
              <ul>
                {o.items.map((i) => (
                  <li key={i.id}>
                    <strong>{i.productName}</strong> · Size {i.sizeName} ·{" "}
                    {i.quantity} ly · {formatPrice(i.lineTotal)}đ<br />
                    {i.toppings.map((t) => t.toppingName).join(", ") ||
                      "Không topping"}
                    {i.note && <p>Ghi chú: {i.note}</p>}
                  </li>
                ))}
              </ul>
              <p>
                Lịch sử:{" "}
                {o.history
                  .map((h) => statusName[h.toStatus] || h.toStatus)
                  .join(" → ")}
              </p>
              {o.payments.map((p) => (
                <p key={p.id}>
                  Thanh toán mô phỏng {p.method}: {p.status} ·{" "}
                  {formatPrice(p.amount)}đ
                </p>
              ))}
              {!staff && o.status === "PENDING_PAYMENT" && (
                <>
                  <p>
                    Hạn giữ:{" "}
                    {o.expiresAt
                      ? new Date(o.expiresAt).toLocaleTimeString("vi-VN")
                      : "—"}
                    . Đây là thanh toán mô phỏng, không thu tiền thật.
                  </p>
                  <div className="store-actions">
                    {["WALLET", "CARD"].map((method) => (
                      <button
                        key={method}
                        disabled={
                          pending ||
                          o.payments.length >= 3 ||
                          o.payments.some((p) =>
                            ["PENDING", "UNKNOWN"].includes(p.status),
                          )
                        }
                        onClick={() => void action(o, "payments", { method })}
                      >
                        {method === "WALLET" ? "Ví mô phỏng" : "Thẻ mô phỏng"}
                      </button>
                    ))}
                    <button
                      disabled={
                        pending ||
                        o.payments.some((p) =>
                          ["PENDING", "UNKNOWN"].includes(p.status),
                        )
                      }
                      onClick={() => void action(o, "cancel", {})}
                    >
                      Hủy đơn
                    </button>
                  </div>
                </>
              )}
              {staff && user?.role === "STAFF" && next[o.status] && (
                <button
                  disabled={pending}
                  onClick={() =>
                    void action(
                      o,
                      "status",
                      {
                        nextStatus: next[o.status],
                        expectedVersion: o.version,
                      },
                      "patch",
                    )
                  }
                >
                  {statusName[next[o.status]]}
                </button>
              )}
            </>
          )}
        </article>
      ))}
    </div>
  );
}
