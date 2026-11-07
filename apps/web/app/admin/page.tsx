"use client";
import { useEffect, useState } from "react";
import { SiteFrame } from "../../components/layout/site-frame";
import { getStore, sendStore, type Order } from "../../services/store.service";
import { authError } from "../../services/auth.service";
import { formatPrice } from "../../lib/format-price";
import { statusName } from "../../components/orders/orders-view";
type Row = Record<string, unknown> & { id: string };
type Field = {
  key: string;
  label: string;
  type?: "number" | "checkbox" | "datetime-local" | "textarea";
  options?: string[];
  source?: "products" | "categories";
};
const fields: Record<string, Field[]> = {
  categories: [
    { key: "name", label: "Tên danh mục" },
    { key: "isActive", label: "Đang sử dụng", type: "checkbox" },
  ],
  products: [
    { key: "name", label: "Tên sản phẩm" },
    { key: "description", label: "Mô tả", type: "textarea" },
    { key: "basePrice", label: "Giá cơ bản (VND)", type: "number" },
    { key: "imageUrl", label: "Đường dẫn ảnh" },
    { key: "categoryId", label: "Danh mục", source: "categories" },
    { key: "isAvailable", label: "Đang bán", type: "checkbox" },
  ],
  sizes: [
    { key: "name", label: "Tên size" },
    { key: "productId", label: "Sản phẩm", source: "products" },
    { key: "extraPrice", label: "Phụ phí (VND)", type: "number" },
    { key: "isAvailable", label: "Khả dụng", type: "checkbox" },
  ],
  toppings: [
    { key: "name", label: "Tên topping" },
    { key: "price", label: "Giá (VND)", type: "number" },
    { key: "isAvailable", label: "Khả dụng", type: "checkbox" },
  ],
  promotions: [
    { key: "code", label: "Mã giảm giá" },
    {
      key: "discountType",
      label: "Loại",
      options: ["FIXED_AMOUNT", "PERCENTAGE"],
    },
    { key: "discountValue", label: "Giá trị", type: "number" },
    { key: "minOrderValue", label: "Đơn tối thiểu (VND)", type: "number" },
    {
      key: "maxDiscount",
      label: "Giảm tối đa (VND), bỏ trống nếu không có",
      type: "number",
    },
    { key: "usageLimit", label: "Giới hạn lượt dùng", type: "number" },
    { key: "startDate", label: "Bắt đầu", type: "datetime-local" },
    { key: "endDate", label: "Kết thúc", type: "datetime-local" },
    { key: "isActive", label: "Đang áp dụng", type: "checkbox" },
  ],
  users: [
    { key: "role", label: "Vai trò", options: ["CUSTOMER", "STAFF"] },
    { key: "isActive", label: "Đang hoạt động", type: "checkbox" },
  ],
};
const names: Record<string, string> = {
  dashboard: "Tổng quan",
  categories: "Danh mục",
  products: "Sản phẩm",
  sizes: "Size và tồn kho",
  toppings: "Topping",
  promotions: "Mã giảm giá",
  users: "Tài khoản",
  orders: "Giám sát đơn",
};
function display(v: unknown) {
  return typeof v === "string" || typeof v === "number"
    ? String(v)
    : typeof v === "boolean"
      ? v
        ? "Có"
        : "Không"
      : "—";
}
export default function AdminPage() {
  const [kind, setKind] = useState("dashboard");
  const [rows, setRows] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboard, setDashboard] = useState<{
    simulatedRevenue: string;
    paidOrders: number;
    products: number;
    label: string;
  } | null>(null);
  const [lookups, setLookups] = useState<Record<string, Row[]>>({});
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (kind === "dashboard") {
          const d =
            await getStore<NonNullable<typeof dashboard>>("/admin/dashboard");
          if (active) setDashboard(d);
        } else if (kind === "orders") {
          const d = await getStore<Order[]>("/admin/orders");
          if (active) setOrders(d);
        } else {
          const d = await getStore<Row[]>(`/admin/${kind}`);
          const refs = await Promise.all(
            (fields[kind] || [])
              .filter((f) => f.source)
              .map(
                async (f) =>
                  [
                    f.source!,
                    await getStore<Row[]>(`/admin/${f.source}`),
                  ] as const,
              ),
          );
          if (active) {
            setRows(d);
            setLookups(Object.fromEntries(refs));
          }
        }
        if (active) setError("");
      } catch (e) {
        if (active) setError(authError(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [kind, attempt]);
  function edit(row: Row | null) {
    setSelected(row);
    const next: Record<string, string | boolean> = {};
    for (const f of fields[kind] || []) {
      const value = row?.[f.key];
      if (f.type === "checkbox") next[f.key] = row ? value === true : true;
      else if (f.type === "datetime-local" && typeof value === "string") {
        const d = new Date(value);
        next[f.key] = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      } else
        next[f.key] = value == null ? f.options?.[0] || "" : display(value);
    }
    setForm(next);
    setEditing(true);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const body: Record<string, unknown> = { ...form };
    if (kind === "promotions") {
      body.usageLimit = Number(form.usageLimit);
      body.startDate = new Date(String(form.startDate)).toISOString();
      body.endDate = new Date(String(form.endDate)).toISOString();
    }
    try {
      await sendStore(
        `/admin/${kind}${selected ? `/${selected.id}` : ""}`,
        body,
        selected ? "patch" : "post",
      );
      setEditing(false);
      setAttempt((a) => a + 1);
    } catch (e) {
      setError(authError(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <SiteFrame>
      <section className="section">
        <div className="container store-workspace">
          <h1>Quản trị BrewLite</h1>
          <nav className="store-actions" aria-label="Quản trị">
            {Object.entries(names).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={kind === key}
                onClick={() => {
                  setKind(key);
                  setLoading(true);
                  setEditing(false);
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          {loading && (
            <p role="status">Đang tải dữ liệu và kiểm tra quyền ADMIN…</p>
          )}
          {error && (
            <p role="alert">
              {error}{" "}
              <button onClick={() => setAttempt((a) => a + 1)}>Thử lại</button>
            </p>
          )}
          {!loading && !error && kind === "dashboard" && dashboard && (
            <article className="store-order">
              <h2>Tổng quan</h2>
              <p>{dashboard.label}</p>
              <p>
                {dashboard.paidOrders} đơn đã thanh toán ·{" "}
                {formatPrice(dashboard.simulatedRevenue)}đ ·{" "}
                {dashboard.products} sản phẩm
              </p>
            </article>
          )}
          {!loading && !error && fields[kind] && (
            <>
              <h2>{names[kind]}</h2>
              {kind !== "users" && (
                <button onClick={() => edit(null)}>Thêm mới</button>
              )}
              {!rows.length && <p>Chưa có dữ liệu.</p>}
              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Tên / Email</th>
                      {fields[kind]
                        .filter(
                          (f) =>
                            !["name", "description", "imageUrl"].includes(
                              f.key,
                            ),
                        )
                        .map((f) => (
                          <th key={f.key}>{f.label}</th>
                        ))}
                      {kind === "sizes" && <><th>On hand</th><th>Reserved</th><th>Available</th><th>Điều chỉnh tồn</th></>}
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>{display(r.name || r.email || r.code)}</td>
                        {fields[kind]
                          .filter(
                            (f) =>
                              !["name", "description", "imageUrl"].includes(
                                f.key,
                              ),
                          )
                          .map((f) => (
                            <td key={f.key}>
                              {f.source
                                ? display(
                                    lookups[f.source]?.find(
                                      (v) => v.id === r[f.key],
                                    )?.name,
                                  )
                                : display(r[f.key])}
                            </td>
                          ))}
                        {kind === "sizes" && (
                          <><td>{r.onHand == null ? "Chưa nhập tồn kho" : display(r.onHand)}</td><td>{display(r.reserved)}</td><td>{r.onHand == null ? "Chưa nhập tồn kho" : Number(r.onHand) - Number(r.reserved)}</td><td>
                            <Inventory
                              row={r}
                              onSaved={() => setAttempt((a) => a + 1)}
                            />
                          </td></>
                        )}
                        <td>
                          <button
                            disabled={kind === "users" && r.role === "ADMIN"}
                            onClick={() => edit(r)}
                          >
                            Sửa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {editing && (
            <form className="admin-form" onSubmit={save}>
              <h2>
                {selected ? "Cập nhật" : "Thêm"} {names[kind]}
              </h2>
              {(fields[kind] || []).map((f) => (
                <label key={f.key}>
                  {f.label}
                  {f.source || f.options ? (
                    <select
                      value={String(form[f.key] || "")}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      required
                    >
                      <option value="">Chọn…</option>
                      {f.source
                        ? (lookups[f.source] || []).map((r) => (
                            <option key={r.id} value={r.id}>
                              {display(r.name)}
                            </option>
                          ))
                        : f.options?.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      value={String(form[f.key] || "")}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                    />
                  ) : (
                    <input
                      type={f.type || "text"}
                      min={f.type === "number" ? 0 : undefined}
                      step={f.type === "number" ? 1 : undefined}
                      checked={
                        f.type === "checkbox" ? form[f.key] === true : undefined
                      }
                      value={
                        f.type === "checkbox"
                          ? undefined
                          : String(form[f.key] ?? "")
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [f.key]:
                            f.type === "checkbox"
                              ? e.target.checked
                              : e.target.value,
                        })
                      }
                      required={
                        !["description", "imageUrl", "maxDiscount"].includes(
                          f.key,
                        ) && f.type !== "checkbox"
                      }
                    />
                  )}
                </label>
              ))}
              <div className="store-actions">
                <button disabled={pending}>Lưu</button>
                <button type="button" onClick={() => setEditing(false)}>
                  Hủy
                </button>
              </div>
            </form>
          )}
          {!loading && !error && kind === "orders" && (
            <>
              {!orders.length && <p>Chưa có đơn mới.</p>}
              {orders.map((o) => (
                <article key={o.id} className="store-order">
                  <h2>{o.orderCode}</h2>
                  <p>
                    {statusName[o.status]} · {formatPrice(o.finalTotal)}đ
                  </p>
                  <ul>
                    {o.items.map((i) => (
                      <li key={i.id}>
                        {i.productName} · {i.sizeName} · {i.quantity} ly ·{" "}
                        {i.note}
                      </li>
                    ))}
                  </ul>
                  {o.payments.map((p) => (
                    <p key={p.id}>
                      {p.method} · {p.status} · {formatPrice(p.amount)}đ
                    </p>
                  ))}
                  <p>
                    {o.history.map((h) => statusName[h.toStatus]).join(" → ")}
                  </p>
                </article>
              ))}
            </>
          )}
        </div>
      </section>
    </SiteFrame>
  );
}
function Inventory({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        if (!value.trim() || !Number.isInteger(Number(value)) || Number(value) < Number(row.reserved)) { setError("Tồn phải là số nguyên không âm và không nhỏ hơn Reserved."); setPending(false); return; }
        try {
          await sendStore(
            `/admin/sizes/${row.id}/inventory`,
            { onHand: Number(value), expectedVersion: row.version },
            "patch",
          );
          setError("");
          setValue("");
          onSaved();
        } catch (e) {
          setError(authError(e));
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Đặt tồn thực tế
        <input
          type="number"
          aria-label={`Tồn thực tế ${display(row.name)}`}
          min={Number(row.reserved)}
          step="1"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button disabled={pending}>Lưu tồn</button>
      {error && <p role="alert">{error}</p>}
      {error && <button type="button" onClick={onSaved}>Tải lại tồn kho trước khi lưu tiếp</button>}
    </form>
  );
}
