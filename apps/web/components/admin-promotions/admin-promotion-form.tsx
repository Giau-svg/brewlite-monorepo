"use client";

import { useState, type FormEvent } from "react";
import { adminPromotionsTheme as theme } from "../../lib/admin-promotions-theme";
import type { AdminPromotion, AdminPromotionDraft } from "../../types/admin-promotion";

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function draftFromPromotion(promotion?: AdminPromotion | null): AdminPromotionDraft {
  return {
    code: promotion?.code ?? "",
    name: promotion?.name ?? "",
    discountType: promotion?.discountType ?? "PERCENTAGE",
    discountValue: promotion?.discountValue ?? 0,
    minOrderValue: promotion?.minOrderValue ?? 0,
    maxDiscount: promotion?.maxDiscount ?? null,
    startsAt: promotion ? toDateTimeLocal(promotion.startsAt) : "",
    endsAt: promotion ? toDateTimeLocal(promotion.endsAt) : "",
    usageLimit: promotion?.usageLimit ?? 1,
    isActive: promotion?.isActive ?? true,
  };
}

export function AdminPromotionForm({
  promotion,
  saving,
  onCancel,
  onSubmit,
}: {
  promotion?: AdminPromotion | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (draft: AdminPromotionDraft) => void;
}) {
  const [draft, setDraft] = useState(() => draftFromPromotion(promotion));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ ...draft, code: draft.code.trim(), name: draft.name.trim() });
  }

  return (
    <form onSubmit={submit} className={`${theme.panel} space-y-4`} noValidate>
      <h2 className="text-lg font-bold">{promotion ? "Sửa khuyến mãi" : "Thêm khuyến mãi"}</h2>
      <label className="block text-sm font-medium" htmlFor="admin-promotion-code">Mã khuyến mãi</label>
      <input id="admin-promotion-code" value={draft.code} onChange={(event) => {
        const code = event.target.value;
        setDraft((current) => ({ ...current, code }));
      }} className={theme.input} />
      <label className="block text-sm font-medium" htmlFor="admin-promotion-name">Tên khuyến mãi</label>
      <input id="admin-promotion-name" value={draft.name} onChange={(event) => {
        const name = event.target.value;
        setDraft((current) => ({ ...current, name }));
      }} className={theme.input} />
      <label className="block text-sm font-medium" htmlFor="admin-promotion-type">Loại giảm giá</label>
      <select id="admin-promotion-type" value={draft.discountType} onChange={(event) => {
        const discountType = event.target.value === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
        setDraft((current) => ({ ...current, discountType }));
      }} className={theme.input}>
        <option value="PERCENTAGE">Phần trăm</option>
        <option value="FIXED_AMOUNT">Số tiền</option>
      </select>
      <label className="block text-sm font-medium" htmlFor="admin-promotion-value">
        {draft.discountType === "PERCENTAGE" ? "Phần trăm giảm" : "Số tiền giảm (đ)"}
      </label>
      <input id="admin-promotion-value" inputMode="numeric" value={String(draft.discountValue)} onChange={(event) => {
        const discountValue = Number(event.target.value);
        setDraft((current) => ({ ...current, discountValue }));
      }} className={theme.input} />
      <label className="block text-sm font-medium" htmlFor="admin-promotion-min">Giá trị đơn tối thiểu (đ)</label>
      <input id="admin-promotion-min" inputMode="numeric" value={String(draft.minOrderValue)} onChange={(event) => {
        const minOrderValue = Number(event.target.value);
        setDraft((current) => ({ ...current, minOrderValue }));
      }} className={theme.input} />
      <label className="block text-sm font-medium" htmlFor="admin-promotion-max">Giảm tối đa (đ), bỏ trống nếu không áp dụng</label>
      <input id="admin-promotion-max" inputMode="numeric" value={draft.maxDiscount === null ? "" : String(draft.maxDiscount)} onChange={(event) => {
        const raw = event.target.value.trim();
        setDraft((current) => ({ ...current, maxDiscount: raw === "" ? null : Number(raw) }));
      }} className={theme.input} />
      <label className="block text-sm font-medium" htmlFor="admin-promotion-start">Thời gian bắt đầu</label>
      <input id="admin-promotion-start" type="datetime-local" value={draft.startsAt} onChange={(event) => {
        const startsAt = event.target.value;
        setDraft((current) => ({ ...current, startsAt }));
      }} className={theme.input} />
      <label className="block text-sm font-medium" htmlFor="admin-promotion-end">Thời gian kết thúc</label>
      <input id="admin-promotion-end" type="datetime-local" value={draft.endsAt} onChange={(event) => {
        const endsAt = event.target.value;
        setDraft((current) => ({ ...current, endsAt }));
      }} className={theme.input} />
      <label className="block text-sm font-medium" htmlFor="admin-promotion-limit">Giới hạn lượt sử dụng</label>
      <input id="admin-promotion-limit" inputMode="numeric" value={String(draft.usageLimit)} onChange={(event) => {
        const usageLimit = Number(event.target.value);
        setDraft((current) => ({ ...current, usageLimit }));
      }} className={theme.input} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.isActive} onChange={(event) => {
          const isActive = event.target.checked;
          setDraft((current) => ({ ...current, isActive }));
        }} />
        Đang kích hoạt
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={saving} className={theme.primary}>{saving ? "Đang lưu..." : "Lưu khuyến mãi"}</button>
        <button type="button" onClick={onCancel} className={theme.secondary}>Hủy</button>
      </div>
    </form>
  );
}
