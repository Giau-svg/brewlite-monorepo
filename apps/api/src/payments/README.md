# Payments — tiến độ backend

Nhánh: `feature/payment-order-status`. Đây là phần service đang phát triển,
chưa phải chức năng thanh toán hoàn chỉnh qua HTTP.

## Đã có

- DTO: orderId, method (WALLET/CARD), idempotencyKey.
- Kiểm tra chủ đơn và trạng thái PENDING_PAYMENT; lấy số tiền từ database.
- MockPaymentService hỗ trợ SUCCESS (mặc định) hoặc FAILED qua PAYMENT_MOCK_RESULT.
- Thành công: ghi payment SUCCESS, chuyển đơn PAID, lưu notification trong transaction.
- Thất bại: ghi payment FAILED, giữ đơn PENDING_PAYMENT.
- Gửi lại cùng key trả giao dịch cũ; lần thử thanh toán mới phải dùng key mới.
- Transaction Serializable và retry cho xung đột; chỉ áp dụng cho cổng giả lập local,
  không đặt cuộc gọi thanh toán tiền thật trong vòng retry này.
- 5 unit test thanh toán và 5 integration test service/PostgreSQL.

## Chưa có / cần phối hợp

- PaymentsController còn trống: chưa có route HTTP thanh toán.
- Chưa nối JWT/guard và userId xác thực từ phần đăng nhập của Quang.
- Không được coi việc kiểm tra userId trong service là xác thực JWT.
- Chưa có API lịch sử/chi tiết đơn hoặc cập nhật trạng thái dành cho nhân viên.
- Chưa tích hợp frontend, kiểm thử HTTP/JWT hoặc E2E toàn hệ thống.
- Chưa thay đổi schema/migration của nhóm.

## Chạy kiểm tra (PowerShell, từ apps/api)

Dùng Node 24 và PostgreSQL đã cài. Cài dependency bằng `npm.cmd ci`.

```powershell
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run build
```

Build cần DATABASE_URL hợp lệ trong .env. Dùng cấu hình local riêng;
không commit .env hoặc .env.test.

## Integration test với database riêng

1. Tạo database `brewlite_payment_test`, owner là tài khoản PostgreSQL local của bạn.
2. Tạo apps/api/.env.test với DATABASE_URL trỏ đúng database này,
   host 127.0.0.1 hoặc localhost và cổng PostgreSQL của bạn.
   URL mẫu (thay user/password/port bằng giá trị của bạn; mã hóa ký tự đặc biệt trong mật khẩu):
   `postgresql://YOUR_USER:YOUR_PASSWORD@127.0.0.1:5432/brewlite_payment_test?schema=public`
3. Đặt PAYMENT_MOCK_RESULT=SUCCESS trong .env.test (hoặc bỏ biến để dùng mặc định).
4. Không để DATABASE_URL/PAYMENT_MOCK_RESULT cũ trong environment của terminal ghi đè file.
5. Chạy:

```powershell
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.test --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand --runTestsByPath test/payments-db.e2e-spec.ts
```

Không cần seed hoặc bật HTTP server. Test tự tạo user/order và dọn đúng các ID đó.
Đây là integration test service/database dù dùng hậu tố e2e-spec để khớp cấu hình Jest.
Các tình huống: Wallet, Card, gửi lại cùng key, đồng thời cùng key, thất bại rồi thử lại.
Chưa kiểm chứng mọi trường hợp cạnh tranh hoặc rollback do lỗi giữa transaction.

## Kết quả kiểm tra ngày 2026-11-07

- Backend lint: đạt.
- Backend unit tests: 18/18 đạt.
- Backend build: đạt.
- Payment database integration tests: 5/5 đạt trên database local riêng.
- Workflow CI hiện tại chưa tự chạy bài integration PostgreSQL này.
