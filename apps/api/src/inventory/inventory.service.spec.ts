import { availableStock } from './inventory.service';
import { configurationKey, normalizeCartNote } from './cart-configuration';
import { inventoryAdjustment } from './inventory.dto';
describe('P2 inventory invariants', () => {
  it('preserves uninitialized stock as null, distinct from zero', () => {
    expect(availableStock({ onHand: null, reserved: 0 })).toBeNull();
    expect(availableStock({ onHand: 0, reserved: 0 })).toBe(0);
  });
  it('computes available stock without using Product legacy inventory', () => {
    expect(availableStock({ onHand: 12, reserved: 4 })).toBe(8);
  });
  it.each([
    { onHand: null, reserved: 1 },
    { onHand: 2, reserved: 3 },
    { onHand: -1, reserved: 0 },
    { onHand: 2, reserved: -1 },
    { onHand: 1.5, reserved: 0 },
  ])('rejects inconsistent inventory %j', (stock) => {
    expect(() => availableStock(stock)).toThrow();
  });
  it.each([
    { onHand: -1, expectedVersion: 0 },
    { onHand: 1.5, expectedVersion: 0 },
    { onHand: 1, expectedVersion: -1 },
    { onHand: 1, expectedVersion: 0, reserved: 0 },
    { onHand: 1 },
  ])('rejects malformed or privileged stock fields %j', (input) => {
    expect(() => inventoryAdjustment(input)).toThrow();
  });
});
describe('P2 cart canonical configuration', () => {
  const input = {
    productId: 'product',
    sizeId: 'size',
    toppingIds: ['b', 'a'],
    note: '  Ít đá\r\nKhông đường  ',
  };
  it('sorts toppings and only trims outer note whitespace/normalizes CRLF', () => {
    expect(configurationKey(input)).toBe(
      configurationKey({
        ...input,
        toppingIds: ['a', 'b'],
        note: 'Ít đá\nKhông đường',
      }),
    );
    expect(normalizeCartNote(' Ít  đá ')).toBe('Ít  đá');
  });
  it('distinguishes size, toppings, note content and note case', () => {
    const key = configurationKey(input);
    for (const change of [
      { sizeId: 'other' },
      { toppingIds: ['a'] },
      { note: 'Ít đá' },
      { note: 'ít đá\nKhông đường' },
    ])
      expect(configurationKey({ ...input, ...change })).not.toBe(key);
  });
});
