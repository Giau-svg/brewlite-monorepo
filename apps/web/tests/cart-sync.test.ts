import { beforeEach, expect, it, vi } from "vitest";
import { executeCartCommand, mergeGuestCart, pendingCartCommand, guestMergePending } from "../services/cart.service";
import { getStore, sendStore } from "../services/store.service";
import type { CartLine } from "../lib/cart-config";
vi.mock("../services/store.service", () => ({ getStore: vi.fn(), sendStore: vi.fn() }));
const line: CartLine = { key: "guest-key", productId: "p", sizeId: "s", name: "Drink", sizeName: "M", quantity: 2, note: "Ít đá", toppings: [], unitPrice: 1, imageUrl: null };
const cart = { version: 3, items: [] };
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); vi.mocked(getStore).mockResolvedValue(cart); });
it("retains guest data on network failure and retries with exactly the same key and payload", async () => {
  let guest = [line]; const commit = vi.fn((lines: CartLine[]) => { guest = lines; });
  vi.mocked(sendStore).mockRejectedValueOnce(new Error("network lost"));
  await expect(mergeGuestCart("u", cart, guest, () => guest, commit)).rejects.toThrow();
  expect(commit).not.toHaveBeenCalled(); expect(guest).toEqual([line]); expect(guestMergePending()).toBe(true);
  const first = vi.mocked(sendStore).mock.calls[0]; vi.mocked(sendStore).mockResolvedValue(cart);
  await mergeGuestCart("u", { ...cart, version: 99 }, guest, () => guest, commit);
  expect(vi.mocked(sendStore).mock.calls[1]).toEqual(first); expect(guest).toEqual([]); expect(guestMergePending()).toBe(false);
  expect(first[1]).toEqual({ items: [{ productId: "p", sizeId: "s", toppingIds: [], quantity: 2, note: "Ít đá" }], expectedVersion: 3 });
});
it("allows adjustment after a definitive validation rejection without deleting the guest cart", async () => {
  const guest = [line]; const commit = vi.fn();
  vi.mocked(sendStore).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: "OUT_OF_STOCK" } } });
  await expect(mergeGuestCart("u", cart, guest, () => guest, commit)).rejects.toBeTruthy();
  expect(commit).not.toHaveBeenCalled(); expect(guestMergePending()).toBe(false); expect(guest[0].quantity).toBe(2);
});
it("resumes an acknowledged merge after an interrupted storage update without sending it again", async () => {
  let guest = [line]; vi.mocked(sendStore).mockResolvedValue(cart);
  await expect(mergeGuestCart("u", cart, guest, () => guest, () => { throw new Error("storage failure"); })).rejects.toThrow();
  await mergeGuestCart("u", cart, guest, () => guest, (lines) => { guest = lines; });
  expect(sendStore).toHaveBeenCalledTimes(1); expect(guest).toEqual([]);
});
it("does not merge an uncertain batch into another account", async () => {
  vi.mocked(sendStore).mockRejectedValue(new Error("network"));
  await expect(mergeGuestCart("first", cart, [line], () => [line], vi.fn())).rejects.toThrow();
  await expect(mergeGuestCart("second", cart, [line], () => [line], vi.fn())).rejects.toThrow(/tài khoản trước/);
  expect(sendStore).toHaveBeenCalledTimes(1);
});
it("retains and replays a mutation command after a lost response instead of inventing a fresh key", async () => {
  const command = { path: "/cart/items", method: "post" as const, body: { quantity: 2 }, key: "stable-request-key" };
  vi.mocked(sendStore).mockRejectedValueOnce(new Error("lost"));
  await expect(executeCartCommand("u", command)).rejects.toThrow(); expect(pendingCartCommand("u")).toEqual(command);
  vi.mocked(sendStore).mockResolvedValue(cart); await executeCartCommand("u", pendingCartCommand("u")!);
  expect(vi.mocked(sendStore).mock.calls[1]).toEqual(vi.mocked(sendStore).mock.calls[0]); expect(pendingCartCommand("u")).toBeNull();
});
