"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDetail, Size, Topping } from "../../types/product";
import { getProduct, ProductNotFoundError } from "../../services/product.service";
import { formatPrice, parsePrice } from "../../lib/format-price";
import { MAX_LINE_QUANTITY, MIN_LINE_QUANTITY, lineTotal } from "../../lib/cart-config";
import { ProductImage } from "../menu/product-image";
import { useCart } from "../cart/cart-provider";

function cheapestSize(sizes: Size[]) {
  return [...sizes].sort((a, b) => parsePrice(a.extraPrice) - parsePrice(b.extraPrice))[0] ?? null;
}

export function ProductDetailView({ id, editKey }: { id: string; editKey?: string }) {
  const { addLine, updateLine, lines } = useCart();
  const router = useRouter();
  const editingLine = editKey ? lines.find((line) => line.key === editKey && line.productId === id) : undefined;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setMissing(false);
      try {
        const data = await getProduct(id);
        if (!active) return;
        setProduct(data);
        setSizeId(editingLine ? editingLine.sizeId : cheapestSize(data.sizes)?.id ?? null);
        setToppingIds(editingLine?.toppings.map((item) => item.id) ?? []);
        setQuantity(editingLine?.quantity ?? 1);
        setNote(editingLine?.note ?? "");
      } catch (caught) {
        if (!active) return;
        if (caught instanceof ProductNotFoundError) setMissing(true);
        else setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) load();
    return () => { active = false; };
  }, [id, attempt, editingLine]);

  const size = product?.sizes.find((item) => item.id === sizeId) ?? null;
  const toppings = useMemo(
    () => (product?.availableToppings ?? []).filter((topping) => topping.isAvailable && toppingIds.includes(topping.id)),
    [product, toppingIds],
  );
  const soldOut = !product || !product.isAvailable || product.stockQuantity < 1;

  const unitPrice = product
    ? parsePrice(product.basePrice) + (size ? parsePrice(size.extraPrice) : 0) + toppings.reduce((sum, topping) => sum + parsePrice(topping.price), 0)
    : 0;

  function addToCart() {
    if (!product || soldOut) return;
    if (product.sizes.length > 0 && !size) {
      setFormError("Hãy chọn một size của món này.");
      return;
    }
    setFormError("");
    const configured = {
      productId: product.id,
      name: product.name.trim(),
      imageUrl: product.imageUrl,
      sizeId: size?.id ?? null,
      sizeName: size?.name ?? "Mặc định",
      toppings: toppings.map((topping) => ({ id: topping.id, name: topping.name.trim(), price: parsePrice(topping.price) })),
      quantity,
      unitPrice,
      note: note.trim(),
    };
    if (editKey) {
      if (!updateLine(editKey, configured)) {
        setFormError("Không thể lưu: món đã bị xóa hoặc cấu hình trùng vượt quá 20 ly.");
        return;
      }
      router.push("/cart");
    } else addLine(configured);
  }

  function toggleTopping(topping: Topping) {
    setToppingIds((current) => current.includes(topping.id)
      ? current.filter((item) => item !== topping.id)
      : [...current, topping.id]);
  }

  return (
    <section className={`section detail-section${editKey ? " detail-editing" : ""}`}>
      <div className="container">
          {loading && <p role="status">Đang tải món...</p>}
          {!loading && missing && (
            <div>
              <p role="alert">Không tìm thấy món này.</p>
              <Link href="/menu" className="btn btn-espresso">Về menu</Link>
            </div>
          )}
          {!loading && error && (
            <div>
              <p role="alert">{error}</p>
              <button type="button" className="btn btn-espresso" onClick={() => setAttempt((value) => value + 1)}>Thử tải lại</button>
            </div>
          )}
          {!loading && product && !missing && !error && (
            <div className="detail-grid">
              <div className="detail-photo">
                <ProductImage url={product.imageUrl} name={product.name.trim()} frame />
              </div>
              <div className="detail-copy">
                {editKey && <p className="detail-edit-label">Chỉnh sửa món trong giỏ</p>}
                <h1>{product.name.trim()}</h1>
                {product.description?.trim() && product.description.trim() !== product.category?.name?.trim() ? (
                  <p className="lead-txt">{product.description.trim()}</p>
                ) : null}
                <p className="field-label">Giá cơ bản</p>
                <p className="bean-price">{formatPrice(product.basePrice)}đ</p>
                {soldOut && <p className="status-line" role="status">{product.isAvailable ? "Hết hàng" : "Món đang ngừng bán"}</p>}

                <fieldset style={{ border: 0, padding: 0, margin: "1.2rem 0" }}>
                  <legend className="field-label">Size</legend>
                  {product.sizes.length === 0 ? (
                    <p>Size mặc định</p>
                  ) : (
                    <div className="choice-row">
                      {product.sizes.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`filter-chip${item.id === sizeId ? " active" : ""}`}
                          aria-pressed={item.id === sizeId}
                          onClick={() => setSizeId(item.id)}
                        >
                          {item.name} · +{formatPrice(item.extraPrice)}đ
                        </button>
                      ))}
                    </div>
                  )}
                </fieldset>

                <fieldset style={{ border: 0, padding: 0, margin: "1.2rem 0" }}>
                  <legend className="field-label">Topping</legend>
                  {product.availableToppings.filter((item) => item.isAvailable).length === 0 ? (
                    <p>Hiện chưa có topping.</p>
                  ) : (
                    <div className="choice-row">
                      {product.availableToppings.filter((item) => item.isAvailable).map((item) => (
                        <label key={item.id} className={`filter-chip${toppingIds.includes(item.id) ? " active" : ""}`} style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={toppingIds.includes(item.id)}
                            onChange={() => toggleTopping(item)}
                            style={{ marginRight: ".4rem" }}
                          />
                          {item.name} · +{formatPrice(item.price)}đ
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>

                <div style={{ margin: "1.2rem 0" }}>
                  <label className="field-label" htmlFor="quantity">Số lượng</label>
                  <div className="qty-step">
                    <button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity((value) => Math.max(MIN_LINE_QUANTITY, value - 1))}>−</button>
                    <input id="quantity" inputMode="numeric" value={quantity} onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isInteger(next)) setQuantity(Math.min(MAX_LINE_QUANTITY, Math.max(MIN_LINE_QUANTITY, next)));
                    }} />
                    <button type="button" aria-label="Tăng số lượng" onClick={() => setQuantity((value) => Math.min(MAX_LINE_QUANTITY, value + 1))}>+</button>
                  </div>
                </div>

                <label className="field-label" htmlFor="note">Ghi chú</label>
                <textarea id="note" className="field-textarea" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: ít đá" />

                <div className="cart-total"><span>Tạm tính</span><span className="amt">{formatPrice(lineTotal(unitPrice, quantity))}đ</span></div>
                {formError && <p role="alert">{formError}</p>}
                <button type="button" className="add-bag" disabled={soldOut} onClick={addToCart}>
                  {soldOut ? "Món không khả dụng" : editKey ? "Lưu thay đổi" : "Thêm vào giỏ hàng"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
  );
}
