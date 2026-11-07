"use client";

import { useState, type FormEvent } from "react";
import { adminProductsTheme as theme } from "../../lib/admin-products-theme";
import type { AdminProduct, AdminProductDraft, AdminTopping } from "../../types/admin-product";

function draftFromProduct(product?: AdminProduct | null): AdminProductDraft {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    basePrice: product?.basePrice ?? 0,
    imageUrl: product?.imageUrl ?? "",
    isAvailable: product?.isAvailable ?? true,
    sizes: product?.sizes.map((size) => ({ name: size.name, extraPrice: size.extraPrice }))
      ?? [{ name: "Size M", extraPrice: 0 }],
    toppingIds: product?.toppingIds ?? [],
  };
}

export function AdminProductForm({
  toppings,
  product,
  saving,
  onCancel,
  onSubmit,
}: {
  toppings: AdminTopping[];
  product?: AdminProduct | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (draft: AdminProductDraft) => void;
}) {
  const [draft, setDraft] = useState(() => draftFromProduct(product));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <form onSubmit={submit} className={`${theme.panel} space-y-4`} noValidate>
      <h2 className="text-lg font-bold">{product ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
      <label className="block text-sm font-medium" htmlFor="admin-product-name">Tên sản phẩm</label>
      <input id="admin-product-name" value={draft.name} onChange={(event) => {
        const name = event.target.value;
        setDraft((current) => ({ ...current, name }));
      }} className={theme.input} />
      <label className="block text-sm font-medium" htmlFor="admin-product-description">Mô tả</label>
      <textarea id="admin-product-description" value={draft.description} onChange={(event) => {
        const description = event.target.value;
        setDraft((current) => ({ ...current, description }));
      }} className={`${theme.input} h-24 py-2`} />
      <label className="block text-sm font-medium" htmlFor="admin-product-price">Giá gốc (đ)</label>
      <input id="admin-product-price" inputMode="numeric" value={String(draft.basePrice)} onChange={(event) => {
        const basePrice = Number(event.target.value);
        setDraft((current) => ({ ...current, basePrice }));
      }} className={theme.input} />
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Size và giá cộng thêm</legend>
        {draft.sizes.map((size, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input aria-label={`Tên size ${index + 1}`} value={size.name} onChange={(event) => {
              const name = event.target.value;
              setDraft((current) => ({
                ...current,
                sizes: current.sizes.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item),
              }));
            }} className={theme.input} />
            <input aria-label={`Giá cộng thêm size ${index + 1}`} inputMode="numeric" value={String(size.extraPrice)} onChange={(event) => {
              const extraPrice = Number(event.target.value);
              setDraft((current) => ({
                ...current,
                sizes: current.sizes.map((item, itemIndex) => itemIndex === index ? { ...item, extraPrice } : item),
              }));
            }} className={theme.input} />
          </div>
        ))}
        <button type="button" className={theme.secondary} onClick={() => setDraft((current) => ({ ...current, sizes: [...current.sizes, { name: "", extraPrice: 0 }] }))}>
          Thêm size
        </button>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Topping có thể chọn</legend>
        <div className="mt-2 space-y-2">
          {toppings.map((topping) => (
            <label key={topping.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.toppingIds.includes(topping.id)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setDraft((current) => ({
                    ...current,
                    toppingIds: checked
                      ? [...current.toppingIds, topping.id]
                      : current.toppingIds.filter((id) => id !== topping.id),
                  }));
                }}
              />
              {topping.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.isAvailable} onChange={(event) => {
          const isAvailable = event.target.checked;
          setDraft((current) => ({ ...current, isAvailable }));
        }} />
        Đang bán
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={saving} className={theme.primary}>{saving ? "Đang lưu..." : "Lưu sản phẩm"}</button>
        <button type="button" onClick={onCancel} className={theme.secondary}>Hủy</button>
      </div>
    </form>
  );
}
