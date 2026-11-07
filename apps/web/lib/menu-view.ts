import { useSyncExternalStore } from "react";

export type MenuView = { query: string; category: string; page: number };

const STORAGE_KEY = "brewlite-menu-view";
const INITIAL: MenuView = { query: "", category: "Tất cả", page: 1 };

let view: MenuView = INITIAL;
let hydrated = false;
const listeners = new Set<() => void>();

function readStored(): MenuView {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<MenuView>;
    const page = parsed.page;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      category: typeof parsed.category === "string" && parsed.category.trim() ? parsed.category : "Tất cả",
      page: Number.isInteger(page) && Number(page) > 0 ? Number(page) : 1,
    };
  } catch {
    return INITIAL;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (!hydrated && typeof sessionStorage !== "undefined") {
    hydrated = true;
    view = readStored();
  }
  return view;
}

function getServerSnapshot() {
  return INITIAL;
}

function writeUrl(next: MenuView) {
  if (typeof window === "undefined" || window.location.pathname !== "/menu") return;
  const url = new URL(window.location.href);
  if (next.query) url.searchParams.set("q", next.query);
  else url.searchParams.delete("q");
  if (next.category && next.category !== "Tất cả") url.searchParams.set("category", next.category);
  else url.searchParams.delete("category");
  if (next.page > 1) url.searchParams.set("page", String(next.page));
  else url.searchParams.delete("page");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function commit(next: MenuView) {
  view = next;
  hydrated = true;
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  writeUrl(next);
  listeners.forEach((listener) => listener());
}

export function useMenuView() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setMenuQuery(query: string) {
  commit({ ...getSnapshot(), query, page: 1 });
}

export function setMenuCategory(category: string) {
  commit({ ...getSnapshot(), category, page: 1 });
}

export function setMenuPage(page: number) {
  commit({ ...getSnapshot(), page: Math.max(1, page) });
}

export function resetMenuView() {
  commit(INITIAL);
}
