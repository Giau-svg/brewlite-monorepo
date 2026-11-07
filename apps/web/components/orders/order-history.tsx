
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

type OrderItem = {
  name: string;
  size: string;
  topping: string;
  quantity: number;
  unitPrice: number;
};

type Order = {
  id: string;
  orderCode: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  pointsUsed: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  note: string;
  earnedPoints: number;
};

type Filter = "ALL" | "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";

type IconName =
  | "coffee"
  | "bag"
  | "clock"
  | "check"
  | "x"
  | "eye"
  | "calendar"
  | "arrow"
  | "receipt"
  | "wallet";

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<IconName, React.ReactNode> = {
    coffee: (
      <>
        <path d="M4 8h13v7a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V8Z" />
        <path d="M17 9h2a3 3 0 0 1 0 6h-2M7 2v3M12 2v3" />
      </>
    ),
    bag: (
      <>
        <rect x="4" y="7" width="16" height="14" rx="2" />
        <path d="M8 9V6a4 4 0 0 1 8 0v3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="M4 12l5 5L20 6" />,
    x: <path d="M5 5l14 14M19 5L5 19" />,
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    receipt: (
      <>
        <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="6" width="18" height="15" rx="3" />
        <path d="M3 10h18M7 6V4h11" />
        <path d="M16 15h2" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const demoOrders: Order[] = [
  {
    id: "1",
    orderCode: "BL-20261107-001",
    createdAt: "2026-11-07T10:35:00",
    status: "READY",
    items: [
      {
        name: "Cà phê sữa đá",
        size: "L",
        topping: "Trân châu",
        quantity: 2,
        unitPrice: 45000,
      },
      {
        name: "Bạc xỉu",
        size: "M",
        topping: "Không",
        quantity: 1,
        unitPrice: 30000,
      },
    ],
    subtotal: 120000,
    discountAmount: 10000,
    pointsUsed: 100,
    total: 100000,
    paymentMethod: "Ví mô phỏng",
    paymentStatus: "Thành công",
    note: "Ít đá",
    earnedPoints: 0,
  },
  {
    id: "2",
    orderCode: "BL-20261105-002",
    createdAt: "2026-11-05T15:20:00",
    status: "COMPLETED",
    items: [
      {
        name: "Cà phê đen đá",
        size: "L",
        topping: "Không",
        quantity: 1,
        unitPrice: 35000,
      },
      {
        name: "Trà đào",
        size: "S",
        topping: "Không",
        quantity: 1,
        unitPrice: 20000,
      },
    ],
    subtotal: 55000,
    discountAmount: 0,
    pointsUsed: 0,
    total: 55000,
    paymentMethod: "Thẻ mô phỏng",
    paymentStatus: "Thành công",
    note: "Không",
    earnedPoints: 5,
  },
  {
    id: "3",
    orderCode: "BL-20261103-003",
    createdAt: "2026-11-03T09:15:00",
    status: "CANCELLED",
    items: [
      {
        name: "Cappuccino",
        size: "M",
        topping: "Không",
        quantity: 1,
        unitPrice: 45000,
      },
    ],
    subtotal: 45000,
    discountAmount: 0,
    pointsUsed: 0,
    total: 45000,
    paymentMethod: "Ví mô phỏng",
    paymentStatus: "Thất bại",
    note: "Không",
    earnedPoints: 0,
  },
  {
    id: "4",
    orderCode: "BL-20261102-004",
    createdAt: "2026-11-02T08:45:00",
    status: "PREPARING",
    items: [
      {
        name: "Latte",
        size: "M",
        topping: "Không",
        quantity: 1,
        unitPrice: 40000,
      },
    ],
    subtotal: 40000,
    discountAmount: 0,
    pointsUsed: 0,
    total: 40000,
    paymentMethod: "Ví mô phỏng",
    paymentStatus: "Thành công",
    note: "Không",
    earnedPoints: 0,
  },
  {
    id: "5",
    orderCode: "BL-20261107-005",
    createdAt: "2026-11-07T11:10:00",
    status: "PENDING_PAYMENT",
    items: [
      {
        name: "Trà sữa truyền thống",
        size: "M",
        topping: "Không",
        quantity: 1,
        unitPrice: 32000,
      },
    ],
    subtotal: 32000,
    discountAmount: 0,
    pointsUsed: 0,
    total: 32000,
    paymentMethod: "Chưa chọn",
    paymentStatus: "Chưa thanh toán",
    note: "Không",
    earnedPoints: 0,
  },
];

const statusInfo: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    className: "bg-[#FFF1DA] text-[#965C15]",
  },
  PAID: {
    label: "Đã thanh toán",
    className: "bg-[#E8F0FF] text-[#315EA8]",
  },
  PREPARING: {
    label: "Đang pha chế",
    className: "bg-[#FFF1DA] text-[#965C15]",
  },
  READY: {
    label: "Sẵn sàng nhận",
    className: "bg-[#E8F5E9] text-[#287A4F]",
  },
  COMPLETED: {
    label: "Đã giao",
    className: "bg-[#E8F5E9] text-[#287A4F]",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-[#FCE8E6] text-[#AC4545]",
  },
};

const filters: { key: Filter; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ thanh toán" },
  { key: "PROCESSING", label: "Đang xử lý" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function filterOrder(order: Order, filter: Filter) {
  switch (filter) {
    case "PENDING":
      return order.status === "PENDING_PAYMENT";
    case "PROCESSING":
      return ["PAID", "PREPARING", "READY"].includes(order.status);
    case "COMPLETED":
      return order.status === "COMPLETED";
    case "CANCELLED":
      return order.status === "CANCELLED";
    default:
      return true;
  }
}

function SummaryCard({
  icon,
  label,
  count,
}: {
  icon: IconName;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-[#E9DDD0] bg-white p-4 sm:p-5">
      <div className="mb-3 text-[#67432D]">
        <Icon name={icon} size={24} />
      </div>
      <p className="text-2xl font-bold text-[#32251D]">{count}</p>
      <p className="mt-1 text-xs text-[#87776B] sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function OrderCard({
  order,
  onDetail,
}: {
  order: Order;
  onDetail: () => void;
}) {
  const item = order.items[0];

  return (
    <article className="rounded-2xl border border-[#E8DCCF] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#32251D]">
            {order.orderCode}
          </h3>
          <p className="mt-2 flex items-center gap-2 text-xs text-[#87776B]">
            <Icon name="calendar" size={15} />
            {formatDate(order.createdAt)}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusInfo[order.status].className}`}
        >
          {statusInfo[order.status].label}
        </span>
      </div>

      <div className="my-5 border-t border-[#F0E8E0]" />

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F4E8DA] text-[#67432D]">
          <Icon name="coffee" size={32} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#32251D]">
            {item.name}
          </p>
          <p className="mt-1 text-sm text-[#87776B]">
            Size {item.size} · x{item.quantity}
          </p>
          {order.items.length > 1 && (
            <p className="mt-1 text-xs text-[#87776B]">
              + {order.items.length - 1} món khác
            </p>
          )}
        </div>
      </div>

      <div className="my-5 border-t border-[#F0E8E0]" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[#87776B]">
            Tổng tiền đơn hàng
          </p>
          <p className="mt-1 text-xl font-bold text-[#67432D]">
            {formatMoney(order.total)}
          </p>
        </div>

        <button
          type="button"
          onClick={onDetail}
          className="inline-flex items-center gap-2 rounded-xl border border-[#67432D] px-4 py-2.5 text-sm font-semibold text-[#67432D] transition hover:bg-[#F8F5F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67432D]"
        >
          <Icon name="eye" size={18} />
          Xem chi tiết
        </button>
      </div>
    </article>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-[#87776B]">{label}</span>
      <span
        className={`text-right ${strong ? "font-bold text-[#67432D]" : "font-medium text-[#32251D]"}`}
      >
        {value}
      </span>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = oldOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="order-detail-title"
              className="text-xl font-bold text-[#32251D]"
            >
              Chi tiết đơn hàng
            </h2>
            <p className="mt-1 text-sm text-[#87776B]">
              {order.orderCode}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết đơn hàng"
            className="rounded-lg p-2 text-[#67432D] hover:bg-[#F8F5F0]"
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span
            className={`rounded-full px-3 py-2 text-xs font-semibold ${statusInfo[order.status].className}`}
          >
            {statusInfo[order.status].label}
          </span>

          <span className="text-xs text-[#87776B]">
            {formatDate(order.createdAt)}
          </span>
        </div>

        <div className="my-5 border-t border-[#EEE3D8]" />

        <h3 className="mb-4 font-bold text-[#32251D]">
          Sản phẩm đã đặt
        </h3>

        <div className="space-y-4">
          {order.items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F4E8DA] text-[#67432D]">
                  <Icon name="coffee" size={23} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#32251D]">
                    {item.name} × {item.quantity}
                  </p>
                  <p className="mt-1 text-xs text-[#87776B]">
                    Size: {item.size}
                  </p>
                  <p className="mt-1 text-xs text-[#87776B]">
                    Topping: {item.topping}
                  </p>
                </div>
              </div>

              <span className="shrink-0 text-sm font-semibold text-[#32251D]">
                {formatMoney(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="my-5 border-t border-[#EEE3D8]" />

        <div className="space-y-3">
          <DetailRow
            label="Tạm tính"
            value={formatMoney(order.subtotal)}
          />
          <DetailRow
            label="Giảm giá"
            value={`-${formatMoney(order.discountAmount)}`}
          />
          <DetailRow
            label="Điểm đã sử dụng"
            value={`${order.pointsUsed} điểm`}
          />

          <div className="border-t border-dashed border-[#DED3C8] pt-3">
            <DetailRow
              label="Tổng thanh toán"
              value={formatMoney(order.total)}
              strong
            />
          </div>
        </div>

        <div className="my-5 border-t border-[#EEE3D8]" />

        <div className="mb-4 flex items-center gap-2 font-bold text-[#32251D]">
          <Icon name="wallet" />
          Thông tin thanh toán
        </div>

        <div className="space-y-3">
          <DetailRow
            label="Phương thức"
            value={order.paymentMethod}
          />
          <DetailRow
            label="Trạng thái thanh toán"
            value={order.paymentStatus}
          />
          <DetailRow label="Ghi chú" value={order.note} />
        </div>

        {order.status === "COMPLETED" && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#E8F5E9] p-3 text-sm font-medium text-[#287A4F]">
            <Icon name="check" />
            Đã cộng {order.earnedPoints} điểm thưởng
          </div>
        )}

        {order.status === "PENDING_PAYMENT" && (
          <div className="mt-5 rounded-xl bg-[#FFF1DA] p-3 text-sm text-[#965C15]">
            Đơn đang chờ thanh toán. Chức năng tiếp tục thanh toán
            sẽ được bổ sung khi kết nối Backend.
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[#67432D] py-3 text-sm font-semibold text-white transition hover:bg-[#543622]"
        >
          Đóng
        </button>
      </section>
    </div>
  );
}

export default function OrderHistory() {
  const [activeFilter, setActiveFilter] = useState<Filter>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const visibleOrders = demoOrders.filter((order) =>
    filterOrder(order, activeFilter)
  );

  const completedCount = demoOrders.filter(
    (order) => order.status === "COMPLETED"
  ).length;

  const processingCount = demoOrders.filter((order) =>
    filterOrder(order, "PROCESSING")
  ).length;

  return (
    <main className="min-h-screen bg-[#F8F5F0] px-4 py-8 text-[#32251D] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#67432D] hover:underline"
        >
          <Icon name="arrow" size={17} />
          Về trang chủ
        </Link>

        <div className="mb-8">
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-[#A05E35]">
            TÀI KHOẢN CỦA TÔI
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Lịch sử đơn hàng
          </h1>

          <p className="mt-3 text-sm text-[#87776B] sm:text-base">
            Theo dõi quá trình pha chế và xem lại các đơn hàng đã đặt.
          </p>
        </div>

        <div className="mb-9 grid grid-cols-3 gap-3">
          <SummaryCard
            icon="bag"
            label="Tổng đơn hàng"
            count={demoOrders.length}
          />
          <SummaryCard
            icon="coffee"
            label="Đang xử lý"
            count={processingCount}
          />
          <SummaryCard
            icon="check"
            label="Hoàn thành"
            count={completedCount}
          />
        </div>

        <section aria-labelledby="order-list-title">
          <h2
            id="order-list-title"
            className="mb-4 text-xl font-bold text-[#32251D]"
          >
            Danh sách đơn hàng
          </h2>

          <div className="mb-6 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-pressed={activeFilter === filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67432D] ${
                  activeFilter === filter.key
                    ? "border-[#67432D] bg-[#67432D] text-white"
                    : "border-[#E4D7CA] bg-white text-[#67432D] hover:bg-[#F0E6DC]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {visibleOrders.length > 0 ? (
            <div className="space-y-4">
              {visibleOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onDetail={() => setSelectedOrder(order)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-[#E8DCCF] bg-white px-6 py-14 text-center">
              <div className="mb-3 text-[#A38E7B]">
                <Icon name="receipt" size={44} />
              </div>
              <h3 className="font-semibold">
                Chưa có đơn hàng
              </h3>
              <p className="mt-2 text-sm text-[#87776B]">
                Không tìm thấy đơn hàng nào thuộc trạng thái này.
              </p>
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-[#87776B]">
          Dữ liệu minh họa. Chưa kết nối tài khoản và API đơn hàng.
        </p>
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </main>
  );
}
