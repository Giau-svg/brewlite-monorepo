import axios from "axios";
import { getStore, sendStore } from "./store.service";
import type { CartLine, NewCartLine } from "../lib/cart-config";

export type ServerCart = {
  version: number; canCheckout?: boolean;
  items: (Omit<CartLine, "unitPrice" | "toppings"> & {
    unitPrice: string; toppings: { id: string; name: string; price: string }[];
  })[];
};
export const cartPayload = (line: NewCartLine) => ({ productId: line.productId, sizeId: line.sizeId, toppingIds: line.toppings.map((t) => t.id), quantity: line.quantity, note: line.note });
export function definitiveCartRejection(error: unknown) {
  return axios.isAxiosError(error) && !!error.response && error.response.status >= 400 && error.response.status < 500 && ![408, 429].includes(error.response.status) && !["IDEMPOTENCY_PENDING", "IDEMPOTENCY_KEY_REUSED"].includes(error.response.data?.code);
}
const JOURNAL = "brewlite-guest-merge";
type MergeJournal = { actor: string; key: string; raw: string; body: { items: ReturnType<typeof cartPayload>[]; expectedVersion?: number }; acknowledged?: boolean };
export function guestMergePending() { return sessionStorage.getItem(JOURNAL) !== null; }
export async function mergeGuestCart(actor: string, cart: ServerCart, guest: CartLine[], read: () => CartLine[], commit: (lines: CartLine[]) => void) {
  let entry: MergeJournal | null = JSON.parse(sessionStorage.getItem(JOURNAL) || "null");
  const legacyName = `brewlite-merge-${actor}`;
  if (!entry && guest.length) {
    const raw = JSON.stringify(guest.map(cartPayload));
    const legacy: { key: string; raw: string } | null = JSON.parse(sessionStorage.getItem(legacyName) || "null");
    entry = { actor, key: legacy?.key ?? crypto.randomUUID(), raw: legacy?.raw ?? raw, body: legacy ? { items: JSON.parse(legacy.raw) } : { items: JSON.parse(raw), expectedVersion: cart.version } };
    sessionStorage.setItem(JOURNAL, JSON.stringify(entry));
  }
  if (!entry) return cart;
  if (entry.actor !== actor) throw new Error("Giỏ tạm đang chờ xác nhận đồng bộ của tài khoản trước. Vui lòng đăng nhập lại tài khoản đó để thử lại.");
  try {
    if (!entry.acknowledged) {
      await sendStore<ServerCart>("/cart/merge", entry.body, "post", entry.key);
      entry.acknowledged = true;
      sessionStorage.setItem(JOURNAL, JSON.stringify(entry));
    }
    const current = read();
    if (current.length && JSON.stringify(current.map(cartPayload)) !== entry.raw) throw new Error("Giỏ tạm đã thay đổi. Dữ liệu được giữ nguyên để bạn kiểm tra trước khi đồng bộ tiếp.");
    if (current.length) commit([]);
    sessionStorage.removeItem(JOURNAL); sessionStorage.removeItem(legacyName);
    return await getStore<ServerCart>("/cart");
  } catch (error) {
    if (definitiveCartRejection(error) && !entry.acknowledged) { sessionStorage.removeItem(JOURNAL); sessionStorage.removeItem(legacyName); }
    throw error;
  }
}

export type CartCommand = { path: string; body: object; method: "post" | "patch" | "delete"; key: string };
export function pendingCartCommand(actor: string): CartCommand | null { return JSON.parse(sessionStorage.getItem(`brewlite-cart-command-${actor}`) || "null"); }
export async function executeCartCommand(actor: string, command: CartCommand) {
  const name = `brewlite-cart-command-${actor}`;
  sessionStorage.setItem(name, JSON.stringify(command));
  try {
    await sendStore<ServerCart>(command.path, command.body, command.method, command.key);
    sessionStorage.removeItem(name);
    return await getStore<ServerCart>("/cart");
  } catch (error) { if (definitiveCartRejection(error)) sessionStorage.removeItem(name); throw error; }
}
