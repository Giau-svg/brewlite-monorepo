# Chạy và triển khai BrewLite

## Local

1. Khởi động Docker Desktop rồi `docker compose up -d postgres` ở root. Giữ volume postgres_data đang có; không dùng down -v/reset/seed.
2. Trong apps/api/.env riêng: giữ DATABASE_URL hiện tại, cấu hình JWT_SECRET ngẫu nhiên >=32 byte, SMTP_USER và SMTP_PASS (Gmail App Password). Không dùng chuỗi ví dụ hoặc commit file này.
3. Từ apps/api: `npm.cmd ci`, `npx.cmd prisma migrate deploy`, `npm.cmd run start:dev`.
4. Từ apps/web: `npm.cmd ci`, `npm.cmd run dev`. NEXT_PUBLIC_API_URL trong .env.local trỏ tới http://localhost:3001 hoặc http://localhost:3001/api.
5. Kiểm tra http://localhost:3001/api/health, /api/products và http://localhost:3000. Đăng ký email thật, nhận OTP Gmail, xác minh rồi đăng nhập.

Không tự thay đổi .env thật. Nếu thiếu SMTP/JWT, đăng ký/đăng nhập có thể lỗi đúng cấu hình; không thay bằng OTP giả.

## Bootstrap ADMIN đã được chỉ định

Chỉ sau khi tài khoản đích tồn tại, đang hoạt động và đã xác minh OTP thật: chạy từ apps/api `npm.cmd run admin:bootstrap -- --dry-run --email <email-đã-được-chủ-chỉ-định>` rồi kiểm tra kết quả và tự chạy applyCommand riêng được CLI in ra.

CLI development/demo có advisory lock và transaction, không tạo User/password, không tự verified, không có public endpoint. Từ chối khi đã có ADMIN khác. Receipt ghi vào IdempotencyRecord với operation bootstrap.admin.approved. Email không hardcode trong logic phân quyền. Cấp STAFF cho tài khoản hoạt động/verified qua ADMIN UI, có audit.

## Dữ liệu và kho

Migration expand giữ nguyên legacy. Size.onHand NULL nghĩa là chưa nhập tồn, không suy từ Product.stockQuantity. ADMIN nhập tồn thực tế và phụ phí qua UI; không tự thêm catalog hoặc số lượng mẫu. Giao dịch legacy không xuất hiện trong số liệu bán hàng mới. Dashboard chỉ gọi aggregate DB và ghi rõ thanh toán mô phỏng.

## Kiểm tra trước phát hành

- apps/api: npm run lint; npm test -- --runInBand; npm run test:e2e; npm run build.
- apps/web: npm run lint; npm test; npm run build.
- Integration runner tạo schema test riêng; không dùng seed hoặc xóa public.
- CI có job matrix lint/unit/build và job PostgreSQL integration. Không tắt SSL/TLS verification. Chưa có bằng chứng GitHub Actions mới vì chưa commit/push.
- PWA có manifest/service worker offline shell. Không cache API/auth/cart/orders. Đăng ký worker chỉ ở production; cần localhost hoặc HTTPS. Cài đặt/offline/browser mobile phải kiểm chứng riêng.

## Docker và CD

Dockerfile nằm trong từng app; build với context tương ứng (ví dụ docker build apps/api). Web cần build-arg NEXT_PUBLIC_API_URL là URL HTTPS API mà trình duyệt truy cập được. API nhận secret qua runtime env/secret manager, không build secret vào image. DATABASE_URL trong container phải dùng địa chỉ PostgreSQL mà container truy cập được, không dùng localhost của host.

Chưa tự triển khai CD: cần nhóm chỉ định hosting, domain/HTTPS, secrets và quyền deploy. Không ghi CD hoàn thành từ CI. Docker image chưa được build/triển khai thực tế trong phiên này.

## Migration/rollback

Backup trước khi migrate; giữ các migration lịch sử. Không rollback bằng drop/reset/down -v. Expand có thể quay lại bản ứng dụng cũ tương thích, giữ cột/bảng mới; nếu đã có giao dịch mới, forward-fix sau review. Khôi phục backup chỉ vào DB clone hoặc theo kế hoạch phục hồi được duyệt, không ghi đè DB hiện tại.