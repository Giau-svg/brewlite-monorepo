import type { Product } from "../types/product";

export async function getProducts(): Promise<Product[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/products`);
  if (!response.ok) {
    throw new Error("Unable to load products");
  }
  return response.json() as Promise<Product[]>;
}
