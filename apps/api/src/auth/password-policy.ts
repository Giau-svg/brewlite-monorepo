export const PASSWORD_MIN_CODE_POINTS = 15;
export const BCRYPT_MAX_BYTES = 72;
/** Count Unicode code points, not UTF-16 code units. Never trim or truncate. */
export function validPassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Array.from(value).length >= PASSWORD_MIN_CODE_POINTS &&
    Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES
  );
}
