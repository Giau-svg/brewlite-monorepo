"use client";
import { useEffect, useSyncExternalStore } from "react";
import { currentUser, type AuthUser } from "../services/auth.service";
let user: AuthUser | null = null;
let loaded = false;
let loadError: string | null = null;
let revision = 0;
let request: Promise<AuthUser | null> | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function setAuthUser(next: AuthUser | null) { user = next; loaded = true; loadError = null; revision += 1; listeners.forEach((fn) => fn()); }
export async function refreshAuth() {
  if (!request) {
    const version = revision;
    request = currentUser().then((next) => { if (version === revision) setAuthUser(next); return user; }).catch((error) => { if (version === revision) { loadError = "Không thể kiểm tra phiên đăng nhập. Giỏ tạm vẫn được giữ nguyên."; listeners.forEach((fn) => fn()); } throw error; }).finally(() => { request = null; });
  }
  return request;
}
export function useAuthStatus() {
  const ready = useSyncExternalStore(subscribe, () => loaded, () => false);
  const error = useSyncExternalStore(subscribe, () => loadError, () => null);
  return { ready, error };
}
export function useAuthUser() {
  const snapshot = useSyncExternalStore(subscribe, () => user, () => null);
  useEffect(() => { if (!loaded) void refreshAuth().catch(() => {}); }, []);
  return snapshot;
}
