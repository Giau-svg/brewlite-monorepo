"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { canAdvanceStaffOrder, nextStaffStatus, staffStatusLabel } from "../../lib/staff-order-flow";
import { staffOrdersTheme as theme } from "../../lib/staff-orders-theme";
import { loadStaffOrders, updateStaffOrderStatus } from "../../services/staff-orders.service";
import type { StaffBoard, StaffOrder, StaffOrderFilter } from "../../types/staff-order";
import { StaffOrderCard } from "./staff-order-card";
import { StaffOrderFilters } from "./staff-order-filters";

const BOARD_MESSAGES = {
  unavailable: "Chưa thể tải đơn lúc này. Tài khoản nhân viên chưa được xác nhận.",
  forbidden: "Bạn không có quyền xem đơn.",
  error: "Không tải được danh sách đơn. Vui lòng thử lại.",
} as const;

const UPDATE_MESSAGES = {
  unavailable: "Chưa thể chuyển trạng thái.",
  forbidden: "Bạn không có quyền cập nhật đơn.",
  conflict: "Đơn vừa được người khác cập nhật. Danh sách đã được tải lại.",
  rejected: "Không chuyển được trạng thái đơn. Danh sách đã được tải lại.",
  error: "Không cập nhật được đơn. Danh sách đã được tải lại.",
} as const;

export function StaffOrdersPage() {
  const [attempt, setAttempt] = useState(0);
  const [board, setBoard] = useState<StaffBoard>({ kind: "loading" });
  const [filter, setFilter] = useState<StaffOrderFilter>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    loadStaffOrders()
      .then((result) => {
        if (active) setBoard(result);
      })
      .catch(() => {
        if (active) setBoard({ kind: "error" });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setMessage("");
    setBoard({ kind: "loading" });
    setAttempt((value) => value + 1);
  }

  async function refresh() {
    try {
      setBoard(await loadStaffOrders());
    } catch {
      setBoard({ kind: "error" });
    }
  }

  async function advance(order: StaffOrder) {
    const target = nextStaffStatus(order.status);
    if (!target || board.kind !== "ready" || !board.canUpdate || updatingId) return;

    setUpdatingId(order.id);
    setMessage("");
    try {
      const result = await updateStaffOrderStatus(order.id, target);
      if (!result.accepted) {
        setMessage(UPDATE_MESSAGES[result.reason]);
        if (result.reason !== "unavailable" && result.reason !== "forbidden") await refresh();
        return;
      }
      if (!canAdvanceStaffOrder(order.status, result.order.status)) {
        setMessage("Thông tin đơn vừa thay đổi. Danh sách đang hiện dữ liệu mới.");
        setBoard((current) => current.kind === "ready"
          ? { ...current, orders: current.orders.map((item) => item.id === result.order.id ? result.order : item) }
          : current);
        return;
      }
      setBoard((current) => current.kind === "ready"
        ? { ...current, orders: current.orders.map((item) => item.id === result.order.id ? result.order : item) }
        : current);
      setMessage(`Đơn ${result.order.orderCode} đã chuyển sang ${staffStatusLabel(result.order.status)}.`);
    } catch {
      setMessage(UPDATE_MESSAGES.error);
      await refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  const visibleOrders = board.kind === "ready"
    ? board.orders.filter((order) => filter === "ALL" || order.status === filter)
    : [];

  return (
    <main className={theme.page}>
      <div className={theme.wrap}>
        <div>
          <Link href="/" className={theme.textLink}>Về trang chủ</Link>
          <h1 className={`mt-3 ${theme.title}`}>Đơn tại quầy</h1>
          <p className={theme.muted}>Chỉ hiện đơn đã thanh toán. Trạng thái đổi khi quán xác nhận.</p>
        </div>

        {board.kind === "loading" && (
          <section className={theme.panel}>
            <p role="status" className={theme.muted}>Đang tải đơn...</p>
          </section>
        )}

        {board.kind !== "loading" && board.kind !== "ready" && (
          <section className={theme.panel}>
            <p role={board.kind === "error" ? "alert" : "status"} className={board.kind === "error" ? theme.alert : theme.notice}>
              {BOARD_MESSAGES[board.kind]}
            </p>
            {board.kind !== "forbidden" && (
              <button type="button" onClick={retry} className={`${theme.primary} mt-4`}>Thử lại</button>
            )}
          </section>
        )}

        {board.kind === "ready" && (
          <>
            <StaffOrderFilters value={filter} onChange={setFilter} />
            {!board.canUpdate && (
              <p role="status" className={theme.notice}>Chưa thể chuyển trạng thái.</p>
            )}
            {message && <p role="status" className={theme.notice}>{message}</p>}
            {visibleOrders.length === 0 ? (
              <section className={theme.panel}>
                <p className={theme.muted}>Chưa có đơn trong mục này.</p>
              </section>
            ) : (
              <div className={theme.grid}>
                {visibleOrders.map((order) => (
                  <StaffOrderCard
                    key={order.id}
                    order={order}
                    canUpdate={board.canUpdate}
                    updating={updatingId === order.id}
                    onAdvance={(current) => {
                      void advance(current);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
