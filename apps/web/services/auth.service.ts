import axios from "axios";
import { apiUrl } from "./product.service";

export type AuthUser = { id: string; fullName: string; email: string; role: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN"; emailVerifiedAt: string; loyaltyPoints: number };
export const authHttp = axios.create({ withCredentials: true, timeout: 15000 });
let refreshing: Promise<unknown> | null = null;
authHttp.interceptors.response.use((response) => response, async (error) => {
  const config = error.config;
  if (error.response?.status !== 401 || !config || config._retried || /\/auth\/(login|register|verify-email|resend-otp|refresh|logout)/.test(config.url ?? "")) return Promise.reject(error);
  config._retried = true;
  if (!refreshing) {
    const refresh = () => authHttp.post(apiUrl("/auth/refresh"));
    refreshing = (typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request("brewlite-auth-refresh", refresh) : refresh()).finally(() => { refreshing = null; });
  }
  try { await refreshing; return await authHttp(config); } catch { return Promise.reject(error); }
});
export function authError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.every((item) => typeof item === "string")) return message.join(" ");
  }
  return "Không thể kết nối dịch vụ. Vui lòng thử lại.";
}
export async function currentUser(): Promise<AuthUser | null> {
  try { return (await authHttp.get<{ user: AuthUser }>(apiUrl("/auth/me"))).data.user; }
  catch (error) { if (axios.isAxiosError(error) && error.response?.status === 401) return null; throw error; }
}
export async function login(email: string, password: string) {
  return (await authHttp.post<{ user: AuthUser }>(apiUrl("/auth/login"), { email, password })).data.user;
}
export async function register(fullName: string, email: string, password: string) {
  return (await authHttp.post<{ message: string }>(apiUrl("/auth/register"), { fullName, email, password })).data;
}
export async function verifyEmail(email: string, code: string) {
  return (await authHttp.post<{ message: string }>(apiUrl("/auth/verify-email"), { email, code })).data;
}
export async function resendOtp(email: string) {
  return (await authHttp.post<{ message: string }>(apiUrl("/auth/resend-otp"), { email })).data;
}
export async function logout() { await authHttp.post(apiUrl("/auth/logout")); }