import { validateAdminProductDraft } from "../../lib/validate-admin-product";
import type {
  AdminCatalog,
  AdminProduct,
  AdminProductDraft,
  AdminProductMutation,
  AdminTopping,
} from "../../types/admin-product";

const seedToppings: AdminTopping[] = [
  { id: "top-pearl", name: "Trân châu trắng", price: 6000, isAvailable: true },
  { id: "top-cheese", name: "Kem cheese", price: 10000, isAvailable: true },
];

const seedProducts: AdminProduct[] = [
  {
    id: "mock-latte",
    name: "Cà phê sữa",
    description: "Cà phê đậm, sữa đặc.",
    basePrice: 29000,
    imageUrl: "",
    isAvailable: true,
    hasOrders: true,
    sizes: [
      { id: "size-latte-m", name: "Size M", extraPrice: 0 },
      { id: "size-latte-l", name: "Size L", extraPrice: 6000 },
    ],
    toppingIds: ["top-pearl"],
  },
  {
    id: "mock-tea",
    name: "Trà đào",
    description: "Trà đào lạnh.",
    basePrice: 35000,
    imageUrl: "",
    isAvailable: false,
    hasOrders: false,
    sizes: [{ id: "size-tea-m", name: "Size M", extraPrice: 0 }],
    toppingIds: ["top-cheese"],
  },
];

let toppings = seedToppings.map((item) => ({ ...item }));
let products = seedProducts.map((item) => ({ ...item, sizes: item.sizes.map((size) => ({ ...size })) }));
let sequence = 3;
let failNextLoad = false;

function cloneCatalog(): AdminCatalog {
  return {
    source: "mock",
    toppings: toppings.map((item) => ({ ...item })),
    products: products.map((item) => ({
      ...item,
      sizes: item.sizes.map((size) => ({ ...size })),
      toppingIds: [...item.toppingIds],
    })),
  };
}

export function resetAdminProductMock() {
  toppings = seedToppings.map((item) => ({ ...item }));
  products = seedProducts.map((item) => ({ ...item, sizes: item.sizes.map((size) => ({ ...size })), toppingIds: [...item.toppingIds] }));
  sequence = 3;
  failNextLoad = false;
}

export function failNextAdminCatalogLoad() {
  failNextLoad = true;
}

export async function loadMockAdminCatalog(): Promise<AdminCatalog> {
  if (failNextLoad) {
    failNextLoad = false;
    throw new Error("mock catalog unavailable");
  }
  return cloneCatalog();
}

export async function createMockAdminProduct(draft: AdminProductDraft): Promise<AdminProductMutation> {
  const message = validateAdminProductDraft(draft);
  if (message) return { ok: false, message };
  const id = `mock-product-${sequence}`;
  sequence += 1;
  const product: AdminProduct = {
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    basePrice: draft.basePrice,
    imageUrl: draft.imageUrl.trim(),
    isAvailable: draft.isAvailable,
    hasOrders: false,
    sizes: draft.sizes.map((size, index) => ({
      id: `${id}-size-${index + 1}`,
      name: size.name.trim(),
      extraPrice: size.extraPrice,
    })),
    toppingIds: [...draft.toppingIds],
  };
  products = [product, ...products];
  return { ok: true, product };
}

export async function updateMockAdminProduct(id: string, draft: AdminProductDraft): Promise<AdminProductMutation> {
  const current = products.find((item) => item.id === id);
  if (!current) return { ok: false, message: "Không tìm thấy sản phẩm để sửa." };
  const message = validateAdminProductDraft(draft);
  if (message) return { ok: false, message };
  const updated: AdminProduct = {
    ...current,
    name: draft.name.trim(),
    description: draft.description.trim(),
    basePrice: draft.basePrice,
    imageUrl: draft.imageUrl.trim(),
    isAvailable: draft.isAvailable,
    sizes: draft.sizes.map((size, index) => ({
      id: current.sizes[index]?.id ?? `${id}-size-${index + 1}`,
      name: size.name.trim(),
      extraPrice: size.extraPrice,
    })),
    toppingIds: [...draft.toppingIds],
  };
  products = products.map((item) => item.id === id ? updated : item);
  return { ok: true, product: updated };
}

export async function setMockAdminProductAvailability(id: string, isAvailable: boolean): Promise<AdminProductMutation> {
  const current = products.find((item) => item.id === id);
  if (!current) return { ok: false, message: "Không tìm thấy sản phẩm." };
  const updated = { ...current, isAvailable };
  products = products.map((item) => item.id === id ? updated : item);
  return { ok: true, product: updated };
}
