// Prisma Decimal is serialized as a JSON string; accept numeric JSON as well.
export type DecimalPrice = string | number;

export type Category = { id: string; name: string };
export type Size = {
  id: string;
  productId: string | null;
  name: string;
  extraPrice: DecimalPrice;
  onHand: number | null;
  reserved: number;
  isAvailable: boolean;
  version: number;
  availableQuantity: number | null;
  inventoryStatus: 'UNINITIALIZED' | 'AVAILABLE' | 'OUT_OF_STOCK';
};

export type Topping = {
  id: string;
  name: string;
  price: DecimalPrice;
  isAvailable: boolean;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  basePrice: DecimalPrice;
  imageUrl: string | null;
  isAvailable: boolean;
  stockQuantity: number;
  categoryId: string | null;
  category: Category | null;
  sizes: Size[];
  createdAt: string;
  updatedAt: string;
};

export type ProductDetail = Product & {
  availableToppings: Topping[];
};
