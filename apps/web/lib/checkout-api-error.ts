const FIELD_LABELS: Record<string, string> = {
  items: "Danh sách món",
  productId: "Mã sản phẩm",
  sizeId: "Mã size",
  toppingIds: "Danh sách topping",
  quantity: "Số lượng",
  note: "Ghi chú",
  couponCode: "Mã giảm giá",
  pointsUsed: "Số điểm",
  userId: "Thông tin đăng nhập",
  sessionId: "Thông tin đăng nhập",
};

const VIETNAMESE_TEXT =
  /[ăâêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵđ]/i;

export class CheckoutApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutApiError";
  }
}

function fieldLabel(path: string): string {
  const nested = path.match(/^items\.(\d+)\.(.+)$/);
  if (nested) {
    const label = FIELD_LABELS[nested[2]] ?? nested[2];
    return `${label} của món ${Number(nested[1]) + 1}`;
  }
  return FIELD_LABELS[path] ?? path;
}

function translateConstraint(message: string): string | null {
  const rules: Array<[RegExp, (...groups: string[]) => string]> = [
    [/^([\w.]+) should not be empty$/, (field) => `${fieldLabel(field)} không được để trống.`],
    [/^([\w.]+) must be a string$/, (field) => `${fieldLabel(field)} phải là chuỗi ký tự.`],
    [/^([\w.]+) must be an integer number$/, (field) => `${fieldLabel(field)} phải là số nguyên.`],
    [/^([\w.]+) must be a number conforming to the specified constraints$/, (field) => `${fieldLabel(field)} không đúng định dạng số.`],
    [/^([\w.]+) must not be less than (\d+)$/, (field, min) => `${fieldLabel(field)} phải lớn hơn hoặc bằng ${min}.`],
    [/^([\w.]+) must be an array$/, (field) => `${fieldLabel(field)} phải là danh sách.`],
    [/^each value in ([\w.]+) must be a string$/, (field) => `Mỗi phần tử trong ${fieldLabel(field)} phải là chuỗi ký tự.`],
    [/^property ([\w.]+) should not exist$/, (field) => `Trường ${fieldLabel(field)} không được phép.`],
    [/^nested property ([\w.]+) must be either object or array$/, (field) => `${fieldLabel(field)} không đúng định dạng.`],
  ];

  for (const [pattern, translate] of rules) {
    const match = message.trim().match(pattern);
    if (match) return translate(...match.slice(1));
  }
  return null;
}

export function formatBackendMessage(message: unknown, status: number): string {
  const parts = Array.isArray(message) ? message : [message];
  const translated = parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => translateConstraint(part) ?? (VIETNAMESE_TEXT.test(part) ? part.trim() : null))
    .filter((part): part is string => Boolean(part));

  if (translated.length > 0) return translated.join(" ");
  if (status === 400) return "Dữ liệu gửi lên không hợp lệ.";
  return "Không thể kết nối. Vui lòng thử lại.";
}

export async function readCheckoutError(response: Response): Promise<CheckoutApiError> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return new CheckoutApiError(formatBackendMessage(body?.message, response.status));
  } catch {
    return new CheckoutApiError(
      response.status === 400
        ? "Dữ liệu gửi lên không hợp lệ."
        : "Không thể kết nối. Vui lòng thử lại.",
    );
  }
}

export function checkoutErrorMessage(error: unknown): string {
  if (error instanceof CheckoutApiError) return error.message;
  if (error instanceof Error && error.message === "NEXT_PUBLIC_API_URL is not configured") {
    return "Không thể kết nối. Vui lòng thử lại.";
  }
  return "Không thể kết nối. Vui lòng thử lại.";
}
