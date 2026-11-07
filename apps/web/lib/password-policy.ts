/** CR-SEC-01: Unicode code points and UTF-8 bytes; never normalize or truncate. */
export function validPassword(value: string): boolean {
  return Array.from(value).length >= 15 && new TextEncoder().encode(value).length <= 72;
}