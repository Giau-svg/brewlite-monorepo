import { authHttp } from "./auth.service";
import { apiUrl } from "./product.service";
export type Order = {
  id: string;
  orderCode: string;
  status: string;
  version: number;
  finalTotal: string;
  createdAt: string;
  expiresAt: string | null;
  items: {
    id: string;
    productName: string;
    sizeName: string;
    quantity: number;
    note: string;
    lineTotal: string;
    toppings: { toppingName: string; price: string }[];
  }[];
  payments: { id: string; status: string; method: string; amount: string }[];
  history: { toStatus: string; createdAt: string }[];
};
export async function getStore<T>(path: string) {
  return (await authHttp.get<T>(apiUrl(path))).data;
}
export async function sendStore<T>(
  path: string,
  body: unknown,
  method: "post" | "patch" | "delete" = "post",
  key = crypto.randomUUID(),
) {
  return (
    await authHttp.request<T>({
      url: apiUrl(path),
      method,
      data: body,
      headers: { "Idempotency-Key": key },
    })
  ).data;
}
