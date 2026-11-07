import { describe, expect, it } from "vitest";
import { addConfiguredLine, replaceConfiguredLine, changeLineQuantity, lineTotal, type NewCartLine } from "../lib/cart-config";

function line(overrides: Partial<NewCartLine> = {}): NewCartLine {
  return {
    productId: "product-1",
    name: "Latte",
    imageUrl: null,
    sizeId: "size-m",
    sizeName: "M",
    toppings: [{ id: "top-1", name: "Trân châu", price: 5000 }],
    quantity: 1,
    unitPrice: 44000,
    note: "",
    ...overrides,
  };
}

describe("configured cart lines", () => {
  it("merges the same size, toppings and note, and keeps a different size separate", () => {
    const once = addConfiguredLine([], line({ quantity: 2 }));
    const twice = addConfiguredLine(once.lines, line({ quantity: 1 }));
    expect(twice.lines).toHaveLength(1);
    expect(twice.lines[0].quantity).toBe(3);
    const otherSize = addConfiguredLine(twice.lines, line({ sizeId: "size-l", sizeName: "L", quantity: 1 }));
    expect(otherSize.lines).toHaveLength(2);
  });

  it("caps a line at 20 and removes it when quantity drops below 1", () => {
    const capped = addConfiguredLine([], line({ quantity: 18 }));
    const overflow = addConfiguredLine(capped.lines, line({ quantity: 5 }));
    expect(overflow.capped).toBe(true);
    expect(overflow.lines[0].quantity).toBe(20);
    expect(lineTotal(44000, 20)).toBe(880000);
    expect(changeLineQuantity(overflow.lines, overflow.lines[0].key, 0)).toEqual([]);
  });
});

it("replaces the edited line instead of increasing its old quantity", () => {
  const original = addConfiguredLine([], line({ quantity: 2 })).lines;
  const updated = replaceConfiguredLine(original, original[0].key, line({ quantity: 3, sizeId: "size-l", note: "Less ice" }));
  expect(updated).toHaveLength(1);
  expect(updated![0]).toMatchObject({ quantity: 3, sizeId: "size-l", note: "Less ice" });
  expect(updated![0].key).not.toBe(original[0].key);
  expect(replaceConfiguredLine(original, "missing", line())).toBeNull();
});

it("rejects an edit that would merge beyond the quantity limit without losing either line", () => {
  const first = addConfiguredLine([], line({ quantity: 15 })).lines;
  const original = addConfiguredLine(first, line({ sizeId: "size-l", quantity: 10 })).lines;
  expect(replaceConfiguredLine(original, original[1].key, line({ quantity: 10 }))).toBeNull();
  expect(original.map((item) => item.quantity)).toEqual([15, 10]);
});