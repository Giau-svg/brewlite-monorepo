import type { Product } from "../types/product";
import { parsePrice } from "../lib/format-price";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProduct(value: unknown): value is Product {
  if (!isRecord(value)) return false;
  const nullableString = (field: unknown) => field === null || typeof field === "string";
  try {
    parsePrice(value.basePrice);
    return typeof value.id === "string" && value.id.length > 0 &&
      typeof value.name === "string" && value.name.trim().length > 0 &&
      nullableString(value.description) && nullableString(value.imageUrl) &&
      nullableString(value.categoryId) && typeof value.isAvailable === "boolean" &&
      Number.isInteger(value.stockQuantity) && Number(value.stockQuantity) >= 0 &&
      typeof value.createdAt === "string" && typeof value.updatedAt === "string" &&
      (value.category === null || (isRecord(value.category) &&
        typeof value.category.id === "string" && typeof value.category.name === "string")) &&
      Array.isArray(value.sizes) && value.sizes.every((size) => {
        if (!isRecord(size)) return false;
        parsePrice(size.extraPrice);
        return typeof size.id === "string" && nullableString(size.productId) && typeof size.name === "string";
      });
  } catch {
    return false;
  }
}

export async function getProducts(): Promise<Product[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  const apiUrl = new URL(baseUrl);
  if (!["http:", "https:"].includes(apiUrl.protocol) || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
    throw new Error("Invalid API URL");
  }
  // Accept the server origin or an API base ending in /api, including a trailing slash.
  const path = apiUrl.pathname.replace(/\/+$/, "");
  apiUrl.pathname = `${path.endsWith("/api") ? path : `${path}/api`}/products`;
  const response = await fetch(apiUrl.toString());
  if (!response.ok) {
    throw new Error("Unable to load products");
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isProduct)) {
    throw new Error("Invalid product response");
  }
  return data;
}
