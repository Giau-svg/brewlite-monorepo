"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteFrame } from "../../components/layout/site-frame";
import { getStore, sendStore } from "../../services/store.service";
import { authError } from "../../services/auth.service";
import { useAuthUser } from "../../lib/auth-store";
type Loyalty = {
  loyaltyPoints: number;
  availablePoints: number;
  reservedPoints: number;
  transactions: {
    id: string;
    type: string;
    points: number;
    balanceAfter: number;
    createdAt: string;
  }[];
};
type Notice = {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  orderId: string | null;
};
export default function AccountPage() {
  const user = useAuthUser();
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([
      getStore<Loyalty>("/account/loyalty"),
      getStore<Notice[]>("/account/notifications"),
    ])
      .then(([l, n]) => {
        if (active) {
          setLoyalty(l);
          setNotices(n);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(authError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <SiteFrame>
      <section className="section">
        <div className="container store-workspace">
          <h1>Tài khoản</h1>
          {user && (
            <p>
              {user.fullName} · {user.email}
            </p>
          )}
          {loading && <p role="status">Đang tải tài khoản…</p>}
          {error && (
            <p role="alert">
              {error}{" "}
              <button onClick={() => setAttempt((a) => a + 1)}>Thử lại</button>{" "}
              <Link href="/login">Đăng nhập</Link>
            </p>
          )}
          {!error && loyalty && (
            <>
              <h2>Điểm thưởng</h2>
              <p>
                {loyalty.loyaltyPoints} điểm · khả dụng{" "}
                {loyalty.availablePoints} · đang giữ {loyalty.reservedPoints}
              </p>
              {!loyalty.transactions.length && (
                <p>Chưa có giao dịch điểm từ đơn hàng mới.</p>
              )}
              <ul>
                {loyalty.transactions.map((t) => (
                  <li key={t.id}>
                    {new Date(t.createdAt).toLocaleString("vi-VN")} · {t.type} ·{" "}
                    {t.points > 0 ? "+" : ""}
                    {t.points} điểm · Số dư {t.balanceAfter}
                  </li>
                ))}
              </ul>
            </>
          )}
          {!loading && !error && (
            <>
              <h2>Thông báo</h2>
              {!notices.length && <p>Chưa có thông báo.</p>}
              {notices.map((n) => (
                <article className="store-order" key={n.id}>
                  <h3>{n.title}</h3>
                  <p>{n.content}</p>
                  {n.orderId && (
                    <Link href={`/orders/${n.orderId}`}>Xem đơn hàng</Link>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={async () => {
                        try {
                          await sendStore(
                            `/account/notifications/${n.id}/read`,
                            {},
                            "patch",
                          );
                          setAttempt((a) => a + 1);
                        } catch (e) {
                          setError(authError(e));
                        }
                      }}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </article>
              ))}
            </>
          )}
        </div>
      </section>
    </SiteFrame>
  );
}
