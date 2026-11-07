"use client";

import { CenteredDialog } from "../ui/centered-dialog";
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  addConfiguredLine,
  cartCount,
  cartSubtotal,
  changeLineQuantity,
  removeLine,
  replaceConfiguredLine,
  type CartLine,
  type NewCartLine,
} from "../../lib/cart-config";

const STORAGE_KEY = "brewlite-config-cart";
const EMPTY: CartLine[] = [];

let linesSnapshot: CartLine[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function readLines(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const lines = parsed.filter((line): line is CartLine => {
      if (typeof line !== "object" || line === null) return false;
      const item = line as CartLine;
      return typeof item.key === "string" && typeof item.productId === "string" &&
        typeof item.name === "string" && typeof item.quantity === "number" &&
        typeof item.unitPrice === "number" && Array.isArray(item.toppings);
    });
    return lines.length > 0 ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (!hydrated) {
    hydrated = true;
    linesSnapshot = readLines();
  }
  return linesSnapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

function commit(next: CartLine[]) {
  linesSnapshot = next.length > 0 ? next : EMPTY;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(linesSnapshot === EMPTY ? [] : linesSnapshot));
  listeners.forEach((listener) => listener());
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  toast: string | null;
  lastAdded: NewCartLine | null;
  dismissToast: () => void;
  openCart: () => void;
  closeCart: () => void;
  addLine: (line: NewCartLine) => void;
  updateLine: (key: string, line: NewCartLine) => boolean;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isOpen, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<CartLine | null>(null);
  const [lastAdded, setLastAdded] = useState<NewCartLine | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    count: cartCount(lines),
    subtotal: cartSubtotal(lines),
    isOpen,
    toast,
    lastAdded,
    dismissToast: () => setToast(null),
    openCart: () => setOpen(true),
    closeCart: () => setOpen(false),
    addLine: (line) => {
      const result = addConfiguredLine(lines, line);
      commit(result.lines);
      setLastAdded(line);
      setToast(result.capped ? "Mỗi cấu hình tối đa 20 ly." : "Thêm vào giỏ hàng thành công");
    },
    updateLine: (key, line) => {
      const next = replaceConfiguredLine(getSnapshot(), key, line);
      if (!next) return false;
      commit(next);
      setLastAdded(line);
      setToast("Cập nhật món thành công");
      return true;
    },
    setQuantity: (key, quantity) => {
      if (!Number.isInteger(quantity)) return;
      const line = lines.find((item) => item.key === key);
      if (!line) return;
      if (quantity < 1) {
        setToast(null);
        setPendingRemoval(line);
        return;
      }
      commit(changeLineQuantity(lines, key, quantity));
    },
    remove: (key) => { setToast(null); setPendingRemoval(lines.find((line) => line.key === key) ?? null); },
    clear: () => commit([]),
  }), [lines, isOpen, toast, lastAdded]);

  return <CartContext.Provider value={value}>
    {children}
    {pendingRemoval && <CenteredDialog label="Xác nhận xóa món" onClose={() => setPendingRemoval(null)}>
      <div className="remove-confirmation">
        <h2>Xóa món khỏi giỏ hàng?</h2>
        <p>Bạn có muốn xóa “{pendingRemoval.name.trim()}” khỏi giỏ hàng không?</p>
        <div className="notice-actions">
          <button type="button" onClick={() => setPendingRemoval(null)}>Hủy</button>
          <button type="button" className="notice-primary" onClick={() => {
            commit(removeLine(getSnapshot(), pendingRemoval.key));
            setPendingRemoval(null);
          }}>Xóa món</button>
        </div>
      </div>
    </CenteredDialog>}
  </CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
