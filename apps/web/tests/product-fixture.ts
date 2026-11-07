import type { Product } from "../types/product";

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Latte", description: null, basePrice: "39000",
    imageUrl: null, isAvailable: true, stockQuantity: 80,
    categoryId: null, category: null, sizes: [],
    createdAt: "2026-11-03T00:00:00.000Z", updatedAt: "2026-11-03T00:00:00.000Z",
    ...overrides,
  };
}