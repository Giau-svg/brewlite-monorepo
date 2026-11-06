"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { paymentResultTheme as theme } from "../../lib/payment-result-theme";
import { loadPaymentResult, retryPayment } from "../../services/payment-result.service";
import type { PaymentOutcome } from "../../types/payment-result";
import { PaymentResultStatus } from "./payment-result-status";

type ViewState = PaymentOutcome | { kind: "loading" };

export function PaymentResultPage() {
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<ViewState>({ kind: "loading" });
  const [retryMessage, setRetryMessage] = useState("");

  useEffect(() => {
    let active = true;
    loadPaymentResult()
      .then((result) => {
        if (active) setOutcome(result);
      })
      .catch(() => {
        if (active) setOutcome({ kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function checkAgain() {
    setRetryMessage("");
    setOutcome({ kind: "loading" });
    setAttempt((value) => value + 1);
  }

  async function onRetryPayment() {
    setRetryMessage("");
    const result = await retryPayment();
    if (!result.accepted) setRetryMessage(result.message);
  }

  return (
    <main className={theme.page}>
      <div className={theme.wrap}>
        <div>
          <Link href="/" className={theme.textLink}>Về trang chủ</Link>
          <h1 className={`mt-3 ${theme.title}`}>Kết quả thanh toán</h1>
          <p className={theme.muted}>Thông tin dưới đây chỉ hiện khi giao dịch đã được xác nhận.</p>
        </div>
        <PaymentResultStatus
          outcome={outcome}
          retryMessage={retryMessage}
          onCheckAgain={checkAgain}
          onRetryPayment={() => {
            void onRetryPayment();
          }}
        />
      </div>
    </main>
  );
}
