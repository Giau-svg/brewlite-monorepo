"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { CenteredDialog } from "../ui/centered-dialog";
import { useAuthUser, useAuthStatus, refreshAuth } from "../../lib/auth-store";
import { authError } from "../../services/auth.service";
import { getStore } from "../../services/store.service";
import { cartPayload as payload, mergeGuestCart, guestMergePending, executeCartCommand, pendingCartCommand, type ServerCart } from "../../services/cart.service";
import { parsePrice } from "../../lib/format-price";
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
let snapshot: CartLine[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function getSnapshot() {
  if (!hydrated) {
    hydrated = true;
    try {
      const parsed: unknown = JSON.parse(
        sessionStorage.getItem(STORAGE_KEY) || "[]",
      );
      if (Array.isArray(parsed))
        snapshot = parsed.filter(
          (i): i is CartLine =>
            i &&
            typeof i.key === "string" &&
            typeof i.productId === "string" &&
            typeof i.quantity === "number" &&
            typeof i.unitPrice === "number" &&
            Array.isArray(i.toppings),
        );
    } catch {
      snapshot = EMPTY;
    }
  }
  return snapshot;
}
function commit(lines: CartLine[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  snapshot = lines.length ? lines : EMPTY;
  listeners.forEach((fn) => fn());
}
const cartLines = (cart: ServerCart): CartLine[] =>
  cart.items.map((i) => ({
    ...i,
    unitPrice: parsePrice(i.unitPrice),
    toppings: i.toppings.map((t) => ({ ...t, price: parsePrice(t.price) })),
  }));
type Context = {
  lines: CartLine[];
  version: number;
  ready: boolean;
  busy: boolean;
  canCheckout: boolean;
  pendingGuest: CartLine[];
  retry: () => void;
  count: number;
  subtotal: number;
  isOpen: boolean;
  toast: string | null;
  lastAdded: NewCartLine | null;
  reload: () => Promise<void>;
  dismissToast: () => void;
  openCart: () => void;
  closeCart: () => void;
  addLine: (line: NewCartLine) => Promise<void>;
  updateLine: (key: string, line: NewCartLine) => Promise<boolean>;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};
const CartContext = createContext<Context | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const local = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const user = useAuthUser();
  const auth = useAuthStatus();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const customer = user?.role === "CUSTOMER";
  const actor = user?.id;
  const [remote, setRemote] = useState<{
    userId: string;
    cart: ServerCart;
  } | null>(null);
  const [syncError, setSyncError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<NewCartLine | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<CartLine | null>(null);
  const serverCart =
    customer && remote?.userId === user.id ? remote.cart : null;
  const lines = useMemo(
    () => (user ? (serverCart ? cartLines(serverCart) : EMPTY) : local),
    [user, serverCart, local],
  );
  async function reload() {
    if (customer) {
      const cart = await getStore<ServerCart>("/cart");
      setRemote({ userId: user.id, cart });
    }
  }
  useEffect(() => {
    if (!customer || !actor) return;
    const actorId = actor;
    let active = true;
    async function sync() {
      try {
        const command = pendingCartCommand(actorId);
        let cart = command ? await executeCartCommand(actorId, command) : await getStore<ServerCart>("/cart");
        if (!active) return;
        setBusy(true); setRemote({ userId: actorId, cart });
        cart = await mergeGuestCart(actorId, cart, getSnapshot(), getSnapshot, commit);
        if (active) {
          setRemote({ userId: actorId, cart });
          setSyncError("");
        }
      } catch (error) {
        if (active) setSyncError(error instanceof Error && !('response' in error) ? error.message : authError(error));
      } finally { if (active) setBusy(false); }
    }
    void sync();
    return () => {
      active = false;
    };
  }, [customer, actor, attempt]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function mutation(
    path: string,
    body: object,
    method: "post" | "patch" | "delete",
  ) {
    if (!customer || !serverCart)
      throw new Error(
        "Giỏ hàng chưa đồng bộ hoặc tài khoản không có quyền mua hàng.",
      );
    if (inFlight.current) throw new Error("Đang lưu giỏ hàng. Vui lòng chờ.");
    if (pendingCartCommand(user.id)) throw new Error("Yêu cầu trước chưa được xác nhận. Hãy thử đồng bộ lại trước khi sửa tiếp.");
    inFlight.current = true; setBusy(true);
    try {
      const cart = await executeCartCommand(user.id, { path, body: { ...body, expectedVersion: serverCart.version }, method, key: crypto.randomUUID() });
      setRemote({ userId: user.id, cart });
    } finally { inFlight.current = false; setBusy(false); }
  }
  const value: Context = {
    lines,
    version: serverCart?.version ?? 0,
    ready: auth.ready && !auth.error && (!user || !!serverCart),
    busy,
    canCheckout: auth.ready && !auth.error && !syncError && !busy && (!customer || !pendingCartCommand(user!.id)) && (!user || local.length === 0) && !!lines.length && lines.every((line) => !!line.sizeId && !line.requiresConfiguration && line.isValid !== false),
    pendingGuest: customer ? local : EMPTY,
    retry: () => { setSyncError(""); void refreshAuth().then(() => setAttempt((a) => a + 1)).catch((error) => setSyncError(authError(error))); },
    reload,
    count: cartCount(lines),
    subtotal: cartSubtotal(lines),
    isOpen,
    toast,
    lastAdded,
    dismissToast: () => setToast(null),
    openCart: () => setOpen(true),
    closeCart: () => setOpen(false),
    addLine: async (line) => {
      try {
        if (!auth.ready || auth.error) throw new Error("Chưa kiểm tra được phiên đăng nhập. Vui lòng thử lại.");
        if (user) await mutation("/cart/items", payload(line), "post");
        else {
          const next = addConfiguredLine(getSnapshot(), line);
          commit(next.lines);
          if (next.capped) {
            setToast(null); setSyncError("Mỗi cấu hình tối đa 20 ly. Giỏ được giữ nguyên, không cắt số lượng.");
            return;
          }
        }
        setLastAdded(line);
        setToast("Thêm vào giỏ hàng thành công");
      } catch (error) {
        setSyncError(authError(error));
      }
    },
    updateLine: async (key, line) => {
      try {
        if (key.startsWith("guest:")) {
          if (guestMergePending()) throw new Error("Cần xác nhận kết quả đồng bộ trước khi chỉnh bản nháp. Hãy thử đồng bộ lại.");
          const next = replaceConfiguredLine(getSnapshot(), key.slice(6), line);
          if (!next) return false; commit(next); return true;
        }
        if (user) await mutation(`/cart/items/${key}`, payload(line), "patch");
        else {
          const next = replaceConfiguredLine(getSnapshot(), key, line);
          if (!next) return false;
          commit(next);
        }
        setLastAdded(line);
        setToast("Cập nhật món thành công");
        return true;
      } catch (error) {
        setSyncError(authError(error));
        return false;
      }
    },
    setQuantity: (key, quantity) => {
      if (!Number.isInteger(quantity)) return;
      if (quantity > 20) { setSyncError("Mỗi cấu hình tối đa 20 ly; số lượng không bị cắt ngầm."); return; }
      const line = lines.find((i) => i.key === key);
      if (!line) return;
      if (quantity < 1) {
        setToast(null);
        setPendingRemoval(line);
        return;
      }
      if (user)
        void mutation(
          `/cart/items/${key}`,
          payload({ ...line, quantity }),
          "patch",
        ).catch((error) => setSyncError(authError(error)));
      else commit(changeLineQuantity(lines, key, quantity));
    },
    remove: (key) => {
      setToast(null);
      const line = key.startsWith("guest:") ? getSnapshot().find((i) => i.key === key.slice(6)) : lines.find((i) => i.key === key);
      setPendingRemoval(line ? { ...line, key } : null);
    },
    clear: () => {
      if (!user) commit([]);
      else setSyncError("Hãy xóa từng món để xác nhận thay đổi giỏ hàng.");
    },
  };
  return (
    <CartContext.Provider value={value}>
      {children}
      {auth.error && <p className="notice notice-warn" role="alert">{auth.error} <button type="button" onClick={value.retry}>Thử lại</button></p>}
      {syncError && (
        <CenteredDialog
          label="Đồng bộ giỏ hàng"
          onClose={() => setSyncError("")}
        >
          <p role="alert">{syncError || auth.error}</p>
          <p>Giỏ khách được giữ lại khi gộp thất bại.</p>
          <button
            onClick={() => {
              setSyncError("");
              value.retry();
            }}
          >
            Thử đồng bộ lại
          </button>
        </CenteredDialog>
      )}
      {pendingRemoval && (
        <CenteredDialog
          label="Xác nhận xóa món"
          onClose={() => setPendingRemoval(null)}
        >
          <div className="remove-confirmation">
            <h2>Xóa món khỏi giỏ hàng?</h2>
            <p>
              Bạn có muốn xóa “{pendingRemoval.name.trim()}” khỏi giỏ hàng
              không?
            </p>
            <div className="notice-actions">
              <button onClick={() => setPendingRemoval(null)}>Hủy</button>
              <button
                className="notice-primary"
                onClick={() => {
                  if (pendingRemoval.key.startsWith("guest:")) {
                    if (guestMergePending()) { setSyncError("Hãy thử đồng bộ lại để xác nhận yêu cầu trước trước khi bỏ bản nháp."); return; }
                    commit(removeLine(getSnapshot(), pendingRemoval.key.slice(6)));
                  } else if (user)
                    void mutation(
                      `/cart/items/${pendingRemoval.key}`,
                      {},
                      "delete",
                    ).catch((error) => setSyncError(authError(error)));
                  else commit(removeLine(getSnapshot(), pendingRemoval.key));
                  setPendingRemoval(null);
                }}
              >
                Xóa món
              </button>
            </div>
          </div>
        </CenteredDialog>
      )}
    </CartContext.Provider>
  );
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
