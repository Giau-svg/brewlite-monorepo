"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { normalizeSearch } from "../../lib/normalize-search";
import { adminPromotionsTheme as theme } from "../../lib/admin-promotions-theme";
import { validateAdminPromotionDraft } from "../../lib/validate-admin-promotion";
import {
  createAdminPromotion,
  loadAdminPromotions,
  setAdminPromotionActive,
  updateAdminPromotion,
} from "../../services/admin-promotions.service";
import type { AdminPromotion, AdminPromotionDraft } from "../../types/admin-promotion";
import { AdminPromotionDetail } from "./admin-promotion-detail";
import { AdminPromotionForm } from "./admin-promotion-form";
import { AdminPromotionList } from "./admin-promotion-list";

type StatusFilter = "all" | "active" | "inactive";
type CatalogPhase = "loading" | "ready" | "unavailable" | "error";
type PendingAction =
  | { kind: "save"; draft: AdminPromotionDraft }
  | { kind: "toggle"; promotion: AdminPromotion };

function ReloadIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

export function AdminPromotionsPage() {
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<CatalogPhase>("loading");
  const [error, setError] = useState("");
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<AdminPromotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<AdminPromotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    let active = true;
    loadAdminPromotions()
      .then((result) => {
        if (!active) return;
        if (result.kind === "ready") {
          setPromotions(result.promotions);
          setPhase("ready");
          setError("");
          return;
        }
        setPromotions([]);
        setCreating(false);
        setEditing(null);
        setViewing(null);
        setPending(null);
        setPhase(result.kind);
        setError(result.kind === "error" ? "Không tải được danh sách khuyến mãi. Vui lòng thử lại." : "");
      })
      .catch(() => {
        if (!active) return;
        setPromotions([]);
        setCreating(false);
        setEditing(null);
        setViewing(null);
        setPending(null);
        setPhase("error");
        setError("Không tải được danh sách khuyến mãi. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const visiblePromotions = promotions.filter((promotion) => {
    const haystack = normalizeSearch(`${promotion.code} ${promotion.name}`);
    const matchesQuery = haystack.includes(normalizeSearch(query));
    const matchesFilter = filter === "all"
      || (filter === "active" && promotion.isActive)
      || (filter === "inactive" && !promotion.isActive);
    return matchesQuery && matchesFilter;
  });

  function reload() {
    setError("");
    setFormError("");
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  function requestSave(draft: AdminPromotionDraft) {
    const invalid = validateAdminPromotionDraft(draft);
    if (invalid) {
      setFormError(invalid);
      setPending(null);
      return;
    }
    setFormError("");
    setPending({ kind: "save", draft });
  }

  async function confirmPending() {
    if (!pending) return;
    setSaving(true);
    setFormError("");
    try {
      const result = pending.kind === "save"
        ? editing
          ? await updateAdminPromotion(editing.id, pending.draft)
          : await createAdminPromotion(pending.draft)
        : await setAdminPromotionActive(pending.promotion.id, !pending.promotion.isActive);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setPromotions((current) => {
        const exists = current.some((item) => item.id === result.promotion.id);
        return exists
          ? current.map((item) => item.id === result.promotion.id ? result.promotion : item)
          : [result.promotion, ...current];
      });
      setViewing((current) => current?.id === result.promotion.id ? result.promotion : current);
      setEditing(null);
      setCreating(false);
      setPending(null);
    } catch {
      setFormError("Không lưu được khuyến mãi. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={theme.page}>
      <div className={theme.wrap}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className={theme.textLink}>Về trang chủ</Link>
            <h1 className={`mt-3 ${theme.title}`}>Khuyến mãi</h1>
            <p className={theme.muted}>Thêm, sửa và bật tắt mã giảm giá, điều kiện đơn và lượt sử dụng.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DED3C8] bg-white text-[#67432D] hover:bg-[#F8F5F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67432D] disabled:cursor-not-allowed disabled:text-[#C9B8A8]"
              disabled={loading}
              aria-label="Tải lại danh sách khuyến mãi"
              title="Tải lại danh sách khuyến mãi"
              onClick={reload}
            >
              <ReloadIcon />
            </button>
            <button type="button" className={theme.primary} disabled={phase !== "ready"} onClick={() => { setCreating(true); setEditing(null); setViewing(null); setPending(null); setFormError(""); }}>
              Thêm khuyến mãi
            </button>
          </div>
        </div>

        {loading && <p role="status" className={theme.panel}>Đang tải khuyến mãi...</p>}
        {!loading && phase === "unavailable" && (
          <section className={theme.panel}>
            <p role="status">Chưa kết nối dữ liệu khuyến mãi.</p>
            <p className={theme.muted}>Thêm, sửa và bật tắt mã chỉ thực hiện khi máy chủ xác nhận.</p>
          </section>
        )}
        {!loading && phase === "error" && (
          <section className={theme.panel}>
            <p role="alert" className={theme.alert}>{error}</p>
          </section>
        )}

        {!loading && phase === "ready" && (
          <>
            <div className={theme.panel}>
              <label htmlFor="admin-promotion-search" className="text-sm font-medium">Tìm theo mã hoặc tên</label>
              <input id="admin-promotion-search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${theme.input} mt-2`} placeholder="Nhập mã hoặc tên" />
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái">
                {([
                  ["all", "Tất cả"],
                  ["active", "Đang bật"],
                  ["inactive", "Đang tắt"],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`${theme.filter} ${filter === value ? theme.filterOn : "bg-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {formError && <p role="alert" className={theme.alert}>{formError}</p>}
            {pending && (
              <section className={theme.panel} aria-label="Xác nhận thao tác">
                <p>
                  {pending.kind === "save"
                    ? "Xác nhận lưu khuyến mãi?"
                    : pending.promotion.isActive
                      ? `Tắt mã ${pending.promotion.code}?`
                      : `Bật mã ${pending.promotion.code}?`}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="button" className={theme.primary} disabled={saving} onClick={() => { void confirmPending(); }}>
                    {saving ? "Đang lưu..." : "Xác nhận"}
                  </button>
                  <button type="button" className={theme.secondary} disabled={saving} onClick={() => setPending(null)}>Quay lại</button>
                </div>
              </section>
            )}
            {(creating || editing) && (
              <AdminPromotionForm
                key={editing?.id ?? "new"}
                promotion={editing}
                saving={saving}
                onCancel={() => { setCreating(false); setEditing(null); setFormError(""); }}
                onSubmit={requestSave}
              />
            )}
            {viewing && (
              <AdminPromotionDetail
                promotion={viewing}
                onClose={() => setViewing(null)}
                onEdit={(promotion) => { setEditing(promotion); setCreating(false); setViewing(null); setPending(null); setFormError(""); }}
                onToggle={(promotion) => { setFormError(""); setPending({ kind: "toggle", promotion }); }}
              />
            )}
            {visiblePromotions.length === 0 ? (
              <p className={theme.panel}>Không có khuyến mãi phù hợp.</p>
            ) : (
              <AdminPromotionList
                promotions={visiblePromotions}
                onView={(promotion) => { setViewing(promotion); setCreating(false); setEditing(null); setPending(null); }}
                onEdit={(promotion) => { setEditing(promotion); setCreating(false); setViewing(null); setPending(null); setFormError(""); }}
                onToggle={(promotion) => { setFormError(""); setPending({ kind: "toggle", promotion }); }}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
