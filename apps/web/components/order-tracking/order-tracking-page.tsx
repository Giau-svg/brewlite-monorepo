"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { orderTrackingTheme as theme } from "../../lib/order-tracking-theme";
import { loadTrackedOrder } from "../../services/order-tracking.service";
import type { OrderTrackingResult } from "../../types/order-tracking";
import { OrderDetails } from "./order-tracking-view";

type Snapshot = {
  orderId: string;
  result: OrderTrackingResult;
};

const MESSAGES = {
  missing: "Thiếu thông tin đơn hàng.",
  unavailable: "Chưa thể tải đơn hàng lúc này. Vui lòng thử lại sau.",
  "not-found": "Không tìm thấy đơn hàng.",
  forbidden: "Bạn không xem được đơn này.",
  error: "Không tải được đơn hàng. Vui lòng thử lại.",
} as const;

export function OrderTrackingPage({ orderId }: { orderId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    let active = true;
    loadTrackedOrder(orderId)
      .then((result) => {
        if (active) setSnapshot({ orderId, result });
      })
      .catch(() => {
        if (active) setSnapshot({ orderId, result: { kind: "error" } });
      });
    return () => {
      active = false;
    };
  }, [orderId, attempt]);

  const result = snapshot?.orderId === orderId ? snapshot.result : null;

  function retry() {
    setSnapshot(null);
    setAttempt((value) => value + 1);
  }

  return (
    <main className={theme.page}>
      <div className={theme.wrap}>
        <div>
          <Link href="/" className={theme.textLink}>Về trang chủ</Link>
          <h1 className={`mt-3 ${theme.title}`}>Theo dõi đơn hàng</h1>
          <p className={theme.muted}>Trạng thái chỉ hiện khi đơn được xác nhận cho tài khoản của bạn.</p>
        </div>

        {!result && (
          <section className={theme.panel}>
            <p role="status" className={theme.muted}>Đang tải đơn hàng...</p>
          </section>
        )}

        {result && result.kind !== "order" && (
          <section className={theme.panel}>
            <p role={result.kind === "error" ? "alert" : "status"} className={result.kind === "error" ? theme.alert : theme.notice}>
              {MESSAGES[result.kind]}
            </p>
            {(result.kind === "error" || result.kind === "unavailable") && (
              <button type="button" onClick={retry} className={`${theme.primary} mt-4`}>
                Thử lại
              </button>
            )}
          </section>
        )}

        {result?.kind === "order" && <OrderDetails order={result.order} />}
      </div>
    </main>
  );
}
