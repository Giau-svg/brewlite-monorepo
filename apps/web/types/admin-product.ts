export type AdminSize = {
  id: string;
  name: string;
  extraPrice: number;
};

export type AdminTopping = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

export type AdminProduct = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  isAvailable: boolean;
  hasOrders: boolean;
  sizes: AdminSize[];
  toppingIds: string[];
};

export type AdminProductDraft = {
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  isAvailable: boolean;
  sizes: Array<{ name: string; extraPrice: number }>;
  toppingIds: string[];
};

export type AdminCatalog = {
  source: "mock" | "api";
  products: AdminProduct[];
  toppings: AdminTopping[];
};

/** Kết quả tải danh sách của ứng dụng. Mock không được trả về từ service thật. */
export type AdminCatalogResult =
  | { kind: "ready"; products: AdminProduct[]; toppings: AdminTopping[] }
  | { kind: "unavailable" }
  | { kind: "error" };

export type AdminProductMutation =
  | { ok: true; product: AdminProduct }
  | { ok: false; message: string };
