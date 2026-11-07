# P3 — Cart & Inventory: trạng thái tiếp tục sau usage limit

Ngày kiểm tra: 2026-11-07. Repository thực tế: `D:\brewlite-monorepo`, nhánh `feature/menu-api-compat`, HEAD `d703bf2`. Chưa commit/push/merge. Working tree đã có nhiều thay đổi P0/P1/P2 từ trước; báo cáo này không coi toàn bộ git diff là thay đổi P3.

## Phần đã lưu trước khi tiếp tục

- DTO merge có `expectedVersion`.
- Controller đã chuyển Idempotency-Key đến service, nhưng thứ tự tham số optional trước required gây lỗi TypeScript.
- Service đã có idempotency cho cart mutation/merge, so sánh payload và trạng thái xử lý. Không mặc định lệnh từng bị từ chối đã thực thi đầy đủ.

## Phần hoàn thiện trong lượt tiếp tục

- Sửa thứ tự tham số controller; mutation và merge chạy qua transaction Serializable cùng idempotency receipt. Cùng key/payload trả kết quả cũ; khác payload trả 409. Version cũ bị từ chối.
- Cart GET trả trạng thái từng dòng, phân biệt cấu hình legacy, ngừng bán, topping không hợp lệ, chưa nhập tồn và thiếu tồn. Kiểm tra tổng số lượng cùng Size. Delete không bị chặn vì dòng khác không hợp lệ.
- Giữ nguyên dòng legacy; chỉ lưu cấu hình rõ ràng do khách chọn sau khi Backend validate. Không đoán Size/Topping.
- Frontend dùng giỏ Backend cho CUSTOMER. Nhật ký session giữ key và payload khi mất phản hồi, hỗ trợ retry/reload; chỉ xóa giỏ khách sau xác nhận merge. Merge thất bại giữ giỏ và có đường chỉnh cấu hình/bỏ món tạm có xác nhận.
- Không tự cắt số lượng vượt 20; Backend và tiện ích giỏ từ chối thay vì âm thầm nhận số lượng khác.
- Header nhận số lượng giỏ; chặn xác nhận mua khi còn lỗi/legacy/chưa đồng bộ.
- ADMIN hiển thị On hand, Reserved, Available; NULL là “Chưa nhập tồn kho”, input để trống. Nhập tồn dùng validation và version/CAS hiện có, lỗi cần tải lại trước khi lưu tiếp.
- Không giữ/trừ tồn khi thêm giỏ; giữ kiểm tra tồn tại ranh giới tạo Order hiện có. Không mở rộng Order/Payment trong P3.

## Các file thuộc lượt tiếp tục

Backend:

- `apps/api/src/commerce/commerce.controller.ts`
- `apps/api/src/commerce/commerce.service.ts`
- `apps/api/package.json`
- `apps/api/scripts/run-p2-tests.cjs`
- `apps/api/test/p2-inventory.e2e-spec.ts`
- `apps/api/test/commerce.e2e-spec.ts`
- `apps/api/test/p3-cart.e2e-spec.ts` (mới)

Frontend:

- `apps/web/services/cart.service.ts` (mới)
- `apps/web/lib/auth-store.ts`
- `apps/web/lib/cart-config.ts`
- `apps/web/components/cart/cart-provider.tsx`
- `apps/web/components/cart/cart-page-body.tsx`
- `apps/web/components/product/product-detail.tsx`
- `apps/web/components/layout/header.tsx`
- `apps/web/components/layout/site-frame.tsx`
- `apps/web/components/checkout/purchase-flow.tsx`
- `apps/web/app/admin/page.tsx`
- `apps/web/tests/cart-sync.test.ts` (mới)
- `apps/web/tests/cart-server.test.tsx`
- `apps/web/tests/cart-config.test.tsx`
- `apps/web/tests/cart-confirmation.test.tsx`
- `apps/web/tests/product-detail.test.tsx`

Kiểm thử trình duyệt: `tests/p3-browser.cjs` (mới). Tài liệu: báo cáo này.

## Kết quả đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Backend lint | Passed |
| Backend TypeScript | Passed |
| Backend unit tests | 53 Passed / 7 suites |
| Backend `nest build` | Passed |
| Backend `npm run build` đầy đủ | Chưa Passed: Prisma generate bị EPERM rename DLL đang được tiến trình khác sử dụng |
| Frontend lint | Passed |
| Frontend TypeScript | Passed |
| Frontend unit tests | 79 Passed / 15 files |
| Frontend build | Passed |
| P2 HTTP inventory regression | 9 Passed trên database test riêng |
| P3 HTTP integration | 10 Passed trên database test riêng |
| P3 UI E2E desktop/mobile | Chưa Passed; không có bằng chứng nghiệm thu giao diện đầy đủ |

P3 HTTP kiểm tra retry không cộng hai lần, key khác payload, stale version/concurrency, merge rollback, không cắt số lượng, tổng SKU, Size/Topping sai, NULL tồn, cấu hình legacy, IDOR, ADMIN/STAFF không được dùng cart CUSTOMER, và kiểm tra tồn tại bước Order.

Test runner chỉ tạo database `brewlite_p2_test_*`/`brewlite_p3_test_*` riêng, áp dụng migrations hiện có và tạo fixture kiểm thử trong database đó; không seed, reset, drop hoặc fallback về database vận hành. Các database test được giữ lại để đối chiếu, không tự xóa.

UI harness dùng Edge profile cô lập và chuyển transport đến Nest test thật; không giả response API. Những lần thử trước thất bại trong harness (CORS test bootstrap và đọc DOM qua CDP); đã sửa nhưng chưa xác minh hết luồng. Không coi các test HTTP/unit là bằng chứng UI E2E Passed.

## Dữ liệu và blocker môi trường

Audit PostgreSQL chỉ đọc so với snapshot trước P3: mọi bảng ngoài `AuthSession` có hash không đổi. Phiên đăng nhập thay đổi; không khôi phục hay can thiệp phiên. Vẫn có 2 CartItem legacy, 16 Size onHand NULL, 3 Order và 3 Payment. Bốn migration đã áp dụng khớp checksum, không chỉnh migration P2.

Ổ C báo 0 byte trống (`ENOSPC`), ổ D còn khoảng 91 GB. Đã dùng TEMP/TMP/npm cache riêng trên `D:\BrewLite-P3-temp` cho các lệnh tiếp theo, không sửa `.env` hoặc cấu hình máy toàn cục. Lượt test cuối đang chờ PostgreSQL, lệnh Docker cũng chưa phản hồi; dừng test runner đó để tránh chạy ngầm. Chưa kết luận nguyên nhân PostgreSQL chắc chắn chỉ do dung lượng.

Không sửa AGENTS.md, `.env`, `.env.local`, stash hoặc tài khoản ADMIN trong lượt này. Không tự nhập tồn cho dữ liệu thật, không xóa CartItem legacy.

## Điều kiện nghiệm thu còn lại

1. Chủ máy giải phóng dung lượng ổ C; kiểm tra Docker/PostgreSQL hoạt động trở lại. Không tự dọn file người dùng.
2. Đóng/restart các tiến trình giữ Prisma client khi phù hợp, chạy lại `npm run build` Backend đầy đủ.
3. Chạy lại `npm run test:p3` với `P3_BROWSER=1`, Next dev đang chạy. Hoàn tất bằng chứng UI guest merge/reload/edit/delete và ADMIN inventory trên desktop/mobile, chỉ database test riêng.
4. Audit lại dữ liệu vận hành sau các kiểm thử; nghiệm thu P3 khi toàn bộ bước trên thực sự Passed.

**Kết luận: P3 chưa đủ điều kiện nghiệm thu đầy đủ. Không có commit/push/merge.**
