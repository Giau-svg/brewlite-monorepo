"use client";
/* eslint-disable @next/next/no-img-element */

import { formatPrice } from "../../lib/format-price";
import { MAX_LINE_QUANTITY, lineTotal } from "../../lib/cart-config";
import { resolveProductImage } from "../../lib/safe-image";
import { useCart } from "./cart-provider";

export function CartLines() {
  const { lines, setQuantity, remove } = useCart();
  if (lines.length === 0) {
    return <p className="empty-bag">Giỏ của bạn đang trống. Hãy chọn một món trong thực đơn.</p>;
  }

  return (
    <div>
      {lines.map((line) => {
        const image = resolveProductImage(line.imageUrl);
        const toppingText = line.toppings.length > 0
          ? line.toppings.map((topping) => topping.name).join(", ")
          : "Không topping";
        return (
          <div className="cart-line" key={line.key}>
            {image ? <img src={image} alt="" width={46} height={46} /> : <span className="img-fallback" style={{ width: 46, height: 46, minHeight: 46, fontSize: "1.2rem", borderRadius: 8 }}>☕</span>}
            <div className="grow">
              <div className="cl-name">{line.name}</div>
              <div className="cl-meta">{line.sizeName} · {toppingText}</div>
              {line.note ? <div className="cl-meta">Ghi chú: {line.note}</div> : null}
              <div className="cl-actions">
                <div className="qty-step" style={{ transform: "scale(.92)", transformOrigin: "left center" }}>
                  <button type="button" aria-label={`Giảm số lượng ${line.name}`} onClick={() => setQuantity(line.key, line.quantity - 1)}>−</button>
                  <input
                    aria-label={`Số lượng ${line.name}`}
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isInteger(next)) setQuantity(line.key, next);
                    }}
                  />
                  <button type="button" aria-label={`Tăng số lượng ${line.name}`} disabled={line.quantity >= MAX_LINE_QUANTITY} onClick={() => setQuantity(line.key, line.quantity + 1)}>+</button>
                </div>
                <button type="button" className="cart-remove" aria-label={`Xóa ${line.name}`} onClick={() => remove(line.key)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" /></svg>
                </button>
              </div>
            </div>
            <div className="cl-price">{formatPrice(lineTotal(line.unitPrice, line.quantity))}đ</div>
          </div>
        );
      })}
    </div>
  );
}
