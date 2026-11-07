# Integration/E2E

Chạy `npm.cmd run test:e2e` từ apps/api. Runner tại apps/api/scripts/run-integration-tests.cjs đọc DATABASE_URL riêng, tạo schema `brewlite_auth_test_<timestamp>`, apply migrations và chạy mọi `apps/api/test/*.e2e-spec.ts` qua HTTP + PostgreSQL.

Không seed/reset/drop schema. Dữ liệu fixture chỉ được tạo trong schema test đã kiểm tra tên. Schema được giữ để xem lại; không đưa fixtures vào public. SMTP bị thay bằng transport kiểm thử ở auth suite, nên kết quả này không chứng minh Gmail gửi thật.

Các suite bao gồm health, toppings/pricing, OTP/cookie/refresh/logout/RBAC, catalog ADMIN, cart merge, order idempotency, UNKNOWN/FAILED/SUCCESS, STAFF, loyalty, tranh SKU cuối và giải phóng quota/điểm/tồn. Unit tests nằm riêng trong apps/web/tests và apps/api/src/**/*.spec.ts.

Browser E2E, cài PWA thực tế và Gmail inbox vẫn cần chạy trên môi trường được cấu hình. Không ghi nhận chúng là đã Pass chỉ từ các test HTTP.