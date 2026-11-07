import type { Product } from "../types/product";
import { normalizeSearch } from "./normalize-search";

export const PAGE_SIZE = 12;

export function categoryName(product: Product) {
  const name = product.category?.name?.trim();
  return name || "Đồ uống khác";
}

export function categoryOptions(products: Product[]) {
  const names = products.filter((product) => product.isAvailable).map(categoryName);
  return ["Tất cả", ...Array.from(new Set(names))];
}

export function filterCatalog(products: Product[], category: string, query: string) {
  const normalizedQuery = normalizeSearch(query);
  return products.filter((product) => {
    if (!product.isAvailable) return false;
    const matchesCategory = category === "Tất cả" || categoryName(product) === category;
    const matchesQuery = normalizeSearch(product.name).includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}

export function pageCount(total: number, pageSize = PAGE_SIZE) {
  if (total <= 0) return 0;
  return Math.ceil(total / pageSize);
}

export function clampPage(page: number, pages: number) {
  if (pages < 1) return 1;
  return Math.min(Math.max(1, page), pages);
}

export function pageSlice<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const pages = pageCount(items.length, pageSize);
  const current = clampPage(page, pages);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pages };
}
