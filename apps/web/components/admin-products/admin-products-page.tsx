"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { normalizeSearch } from "../../lib/normalize-search";
import { adminProductsTheme as theme } from "../../lib/admin-products-theme";
import { validateAdminProductDraft } from "../../lib/validate-admin-product";
import {
  createAdminProduct,
  loadAdminCatalog,
  setAdminProductAvailability,
  updateAdminProduct,
} from "../../services/admin-products.service";
import type { AdminProduct, AdminProductDraft, AdminTopping } from "../../types/admin-product";
import { AdminProductForm } from "./admin-product-form";
import { AdminProductList } from "./admin-product-list";

type AvailabilityFilter = "all" | "selling" | "hidden";
type CatalogPhase = "loading" | "ready" | "unavailable" | "error";

export function AdminProductsPage() {
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<CatalogPhase>("loading");
  const [error, setError] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [toppings, setToppings] = useState<AdminTopping[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AvailabilityFilter>("all");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    loadAdminCatalog()
      .then((result) => {
        if (!active) return;
        if (result.kind === "ready") {
          setProducts(result.products);
          setToppings(result.toppings);
          setPhase("ready");
          setError("");
          return;
        }
        setProducts([]);
        setToppings([]);
        setCreating(false);
        setEditing(null);
        setPhase(result.kind);
        setError(result.kind === "error" ? "Không tải được danh sách sản phẩm. Vui lòng thử lại." : "");
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
        setToppings([]);
        setCreating(false);
        setEditing(null);
        setPhase("error");
        setError("Không tải được danh sách sản phẩm. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const visibleProducts = products.filter((product) => {
    const matchesName = normalizeSearch(product.name).includes(normalizeSearch(query));
    const matchesFilter = filter === "all"
      || (filter === "selling" && product.isAvailable)
      || (filter === "hidden" && !product.isAvailable);
    return matchesName && matchesFilter;
  });

  async function save(draft: AdminProductDraft) {
    const invalid = validateAdminProductDraft(draft);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const result = editing
        ? await updateAdminProduct(editing.id, draft)
        : await createAdminProduct(draft);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setProducts((current) => editing
        ? current.map((item) => item.id === result.product.id ? result.product : item)
        : [result.product, ...current]);
      setEditing(null);
      setCreating(false);
    } catch {
      setFormError("Không lưu được sản phẩm. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(product: AdminProduct) {
    setFormError("");
    try {
      const result = await setAdminProductAvailability(product.id, !product.isAvailable);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setProducts((current) => current.map((item) => item.id === result.product.id ? result.product : item));
    } catch {
      setFormError("Không lưu được sản phẩm. Vui lòng thử lại.");
    }
  }

  return (
    <main className={theme.page}>
      <div className={theme.wrap}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className={theme.textLink}>Về trang chủ</Link>
            <h1 className={`mt-3 ${theme.title}`}>Sản phẩm</h1>
            <p className={theme.muted}>Thêm, sửa và ẩn đồ uống, size, topping cùng giá bán.</p>
          </div>
          <button type="button" className={theme.primary} disabled={phase !== "ready"} onClick={() => { setCreating(true); setEditing(null); setFormError(""); }}>
            Thêm sản phẩm
          </button>
        </div>

        {loading && <p role="status" className={theme.panel}>Đang tải sản phẩm...</p>}
        {!loading && phase === "unavailable" && (
          <section className={theme.panel}>
            <p role="status">Chưa kết nối dữ liệu sản phẩm.</p>
            <p className={theme.muted}>Thêm, sửa và ẩn sản phẩm chỉ thực hiện khi máy chủ xác nhận.</p>
          </section>
        )}
        {!loading && phase === "error" && (
          <section className={theme.panel}>
            <p role="alert" className={theme.alert}>{error}</p>
            <button type="button" className={`${theme.primary} mt-4`} onClick={() => { setError(""); setLoading(true); setAttempt((value) => value + 1); }}>
              Thử lại
            </button>
          </section>
        )}

        {!loading && phase === "ready" && (
          <>
            <div className={theme.panel}>
              <label htmlFor="admin-product-search" className="text-sm font-medium">Tìm theo tên</label>
              <input id="admin-product-search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${theme.input} mt-2`} placeholder="Nhập tên đồ uống" />
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Lọc tình trạng bán">
                {([
                  ["all", "Tất cả"],
                  ["selling", "Đang bán"],
                  ["hidden", "Đang ẩn"],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`${theme.filter} ${filter === value ? theme.filterOn : "bg-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {formError && <p role="alert" className={theme.alert}>{formError}</p>}
            {(creating || editing) && (
              <>
                <AdminProductForm
                  key={editing?.id ?? "new"}
                  toppings={toppings}
                  product={editing}
                  saving={saving}
                  onCancel={() => { setCreating(false); setEditing(null); setFormError(""); }}
                  onSubmit={(draft) => { void save(draft); }}
                />
              </>
            )}
            {visibleProducts.length === 0 ? (
              <p className={theme.panel}>Không có sản phẩm phù hợp.</p>
            ) : (
              <AdminProductList products={visibleProducts} toppings={toppings} onEdit={(product) => { setEditing(product); setCreating(false); setFormError(""); }} onToggle={(product) => { void toggle(product); }} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
