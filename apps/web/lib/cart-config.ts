export const MIN_LINE_QUANTITY = 1;
export const MAX_LINE_QUANTITY = 20;

export type CartTopping = {
  id: string;
  name: string;
  price: number;
};

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  sizeId: string | null;
  sizeName: string;
  toppings: CartTopping[];
  quantity: number;
  unitPrice: number;
  note: string;
};

export type NewCartLine = Omit<CartLine, "key" | "quantity"> & { quantity: number };

export function configurationKey(productId: string, sizeId: string | null, toppingIds: string[], note: string) {
  const toppings = [...toppingIds].sort().join(",");
  return [productId, sizeId ?? "", toppings, note.trim()].join("|");
}

export function clampQuantity(quantity: number) {
  if (!Number.isInteger(quantity)) return MIN_LINE_QUANTITY;
  return Math.min(MAX_LINE_QUANTITY, Math.max(MIN_LINE_QUANTITY, quantity));
}

export function lineTotal(unitPrice: number, quantity: number) {
  return unitPrice * quantity;
}

export function addConfiguredLine(lines: CartLine[], incoming: NewCartLine) {
  const key = configurationKey(
    incoming.productId,
    incoming.sizeId,
    incoming.toppings.map((topping) => topping.id),
    incoming.note,
  );
  const quantity = clampQuantity(incoming.quantity);
  const existing = lines.find((line) => line.key === key);
  if (!existing) {
    return {
      lines: [...lines, { ...incoming, key, quantity, note: incoming.note.trim() }],
      capped: incoming.quantity > MAX_LINE_QUANTITY,
    };
  }
  const combined = existing.quantity + quantity;
  const nextQuantity = Math.min(MAX_LINE_QUANTITY, combined);
  return {
    lines: lines.map((line) => line.key === key ? { ...line, quantity: nextQuantity, unitPrice: incoming.unitPrice } : line),
    capped: combined > MAX_LINE_QUANTITY,
  };
}

export function changeLineQuantity(lines: CartLine[], key: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < MIN_LINE_QUANTITY) {
    return lines.filter((line) => line.key !== key);
  }
  const nextQuantity = Math.min(MAX_LINE_QUANTITY, quantity);
  return lines.map((line) => line.key === key ? { ...line, quantity: nextQuantity } : line);
}

export function removeLine(lines: CartLine[], key: string) {
  return lines.filter((line) => line.key !== key);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + lineTotal(line.unitPrice, line.quantity), 0);
}

export function replaceConfiguredLine(lines: CartLine[], key: string, incoming: NewCartLine) {
  if (!lines.some((line) => line.key === key && line.productId === incoming.productId)) return null;
  const result = addConfiguredLine(removeLine(lines, key), incoming);
  return result.capped ? null : result.lines;
}