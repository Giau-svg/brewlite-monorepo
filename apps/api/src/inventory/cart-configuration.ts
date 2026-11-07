import { createHash } from 'node:crypto';
export function normalizeCartNote(note: string) {
  return note.replace(/\r\n/g, '\n').trim();
}
export function configurationKey(input: {
  productId: string;
  sizeId: string;
  toppingIds: string[];
  note: string;
}) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        input.productId,
        input.sizeId,
        [...input.toppingIds].sort(),
        normalizeCartNote(input.note),
      ]),
    )
    .digest('hex');
}
