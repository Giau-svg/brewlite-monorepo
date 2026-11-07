/** Accepts a public product image path or an absolute http(s) URL. */
export function resolveProductImage(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const value = url.trim();
  if (!value) return null;

  if (value.startsWith("/images/")) {
    if (value.includes("..") || value.includes("\\") || value.includes("//")) return null;
    if (!/^\/images\/[A-Za-z0-9._/-]+$/.test(value)) return null;
    return value;
  }

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
