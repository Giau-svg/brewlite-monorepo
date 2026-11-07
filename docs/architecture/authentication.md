# Xác thực BrewLite — triển khai P1

> Cập nhật 07/11/2026: OTP5m, access15m, refresh7d rotation/reuse detection đã có code và test HTTP riêng. Người dùng đã kiểm chứng Gmail OTP, xác minh và đăng nhập qua UI; Prisma xác nhận tài khoản đích đã verified. Bootstrap ADMIN mới dry-run, chưa apply.

Yêu cầu mới sử dụng email thay cho số điện thoại. Các role cũ được giữ nguyên; bổ sung ADMIN. Tài khoản đăng ký qua API luôn có role CUSTOMER. SRS/policy/RTM đã được đồng bộ mục tiêu ở P0; UML ảnh gốc chưa được sửa. Code runtime hiện tại vẫn như phần mô tả dưới.

## Cấu hình local

Trong `apps/api/.env` (được Git ignore), giữ DATABASE_URL hiện có và tự cấu hình:

```dotenv
FRONTEND_ORIGIN=http://localhost:3000
JWT_SECRET=<chuỗi ngẫu nhiên riêng tối thiểu 32 byte>
SMTP_USER=<địa chỉ Gmail gửi OTP>
SMTP_PASS=<Gmail App Password>
```

Không dùng mật khẩu Gmail thông thường. Bật 2-Step Verification và tạo App Password theo https://support.google.com/accounts/answer/185833 . Không đưa secret vào Git/chat/log. Có thể tạo JWT secret tại terminal riêng bằng `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` rồi dán vào .env. Không dùng JWT secret ví dụ cũ.

Gmail được kết nối qua smtp.gmail.com:465 với TLS và kiểm tra certificate mặc định. Chưa cấu hình SMTP thì API báo lỗi gửi email; không trả OTP cho Frontend. Tài khoản chưa xác minh có thể dùng Gửi lại OTP sau khi cấu hình email.

```powershell
cd apps/api
npm.cmd ci
npx.cmd prisma migrate deploy
npm.cmd run start:dev
```

Các migration expand thêm ADMIN, xác minh/phiên, inventory/cart/order foundations; không tự xác minh tài khoản cũ, không reset hoặc chạy seed. Tài khoản seed dùng password không hợp lệ với bcrypt phải được thay bằng đăng ký thật, không tự cấp phiên cho tài khoản đó.

Frontend dùng `apps/web/.env.local` hiện có, NEXT_PUBLIC_API_URL trỏ tới `http://localhost:3001` hoặc `http://localhost:3001/api`. Dùng localhost nhất quán, tránh trộn với 127.0.0.1. Khởi động web bằng `npm.cmd run dev` trong apps/web.

## Hợp đồng

| API | Dữ liệu / quyền |
| --- | --- |
| POST /api/auth/register | fullName, email, password; role công khai bị bỏ qua |
| POST /api/auth/verify-email | email, code 6 chữ số |
| POST /api/auth/resend-otp | email; cooldown 60 giây |
| POST /api/auth/login | email, password; trả user an toàn, JWT chỉ trong Set-Cookie |
| GET /api/auth/me | JWT cookie hợp lệ và phiên chưa thu hồi |
| POST /api/auth/refresh | refresh cookie opaque, hash DB, rotation và revoke family khi reuse |
| POST /api/auth/logout | thu hồi phiên và xóa cookie cùng path/options |
| GET /api/admin/users | JWT + role ADMIN lấy từ database, tối đa 100 tài khoản; không passwordHash |
| /api/cart/* | JWT bắt buộc; userId lấy từ phiên, kiểm tra sở hữu khi xóa |

JWT HS256 có issuer/audience, hạn 15 phút, liên kết phiên lưu DB. Cookie HttpOnly, SameSite=Lax, path=/api; Secure khi NODE_ENV=production. Chưa có refresh token: hết 15 phút phải đăng nhập lại. Chạy production cùng site qua HTTPS; nếu muốn cross-site cần thiết kế lại SameSite/CSRF thay vì bật tùy ý.

Mọi POST/DELETE được bảo vệ yêu cầu Origin trong FRONTEND_ORIGIN. CORS bật credentials với origin cụ thể. Axios dùng withCredentials; không lưu JWT vào localStorage/sessionStorage hoặc trả token qua JSON.

OTP được sinh bằng crypto, chỉ lưu bcrypt hash, hạn 10 phút, tối đa 5 lần thử, tiêu thụ một lần bằng transaction. Có giới hạn tần suất theo IP và cooldown lưu DB. Throttler hiện dùng bộ nhớ một tiến trình; cần storage dùng chung nếu chạy nhiều replica. Không bật trust proxy tùy ý.

Mật khẩu ít nhất 15 ký tự và tối đa 72 byte UTF-8 để không bị bcrypt cắt ngầm. Bcrypt cost=12. ADMIN không được cấp qua đăng ký; quản trị viên database chỉ nâng role cho tài khoản đã đăng ký và xác minh sau khi kiểm tra danh tính. Không có API tự nâng role.

## Frontend và mua hàng

Form có Đăng ký -> nhập OTP -> Đăng nhập. Header hiện tài khoản và Đăng xuất theo /auth/me; chỉ ADMIN có liên kết /admin, API vẫn kiểm tra quyền độc lập.

Giỏ hàng -> Xác nhận mua -> kiểm tra /auth/me -> đăng nhập/đăng ký nếu cần -> sau xác thực mới hiện điểm/mã và tính lại tổng qua API. Đóng form không xóa giỏ. Tạo đơn, giữ tồn kho và thanh toán chưa được bổ sung trong phần Auth này; không có thông báo thành công giả.

## Kiểm thử

Backend unit: `npm.cmd test -- --runInBand`.
Frontend: `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`.

`test/auth.e2e-spec.ts` dùng HTTP, bcrypt/JWT và PostgreSQL thật, thay EmailService bằng bộ gửi test giữ mã trong bộ nhớ (không gửi Gmail thật, không log/trả mã qua API). Chỉ chạy khi AUTH_TEST_DATABASE_URL trỏ vào schema riêng có tiền tố brewlite_auth_test_. Tạo schema test mới bằng cách đặt tham số schema trong URL, chạy prisma migrate deploy với DATABASE_URL test, rồi:

```powershell
npm.cmd run test:e2e -- --runInBand --testPathPatterns=auth.e2e-spec
```

Không dùng URL public/schema dữ liệu đồ án cho test này. Các schema test được giữ lại để kiểm tra, không có thao tác tự xóa database. Kiểm chứng Gmail end-to-end cần SMTP_USER/SMTP_PASS thực và người nhận kiểm tra hộp thư.

CR-SEC-01 được người yêu cầu phê duyệt: tối thiểu 15 Unicode code points, tối đa 72 byte UTF-8, từ chối vượt giới hạn, không truncate/normalize/trim mật khẩu. FE/BE có cùng các ca biên tiếng Việt/emoji. Không coi các ca kiểm tra độ dài là đã hoàn tất weak-password blocklist policy.

Bootstrap: xem [deployment](../deployment.md). CLI chỉ cấp cho User tồn tại, active và đã verified; ghi audit, không có email ADMIN hardcode hoặc mật khẩu mặc định. Tài khoản đích chỉ định đã tồn tại, active và verified. Dry-run READY_TO_PROMOTE; chưa apply nên role vẫn CUSTOMER.

## Bootstrap ADMIN thủ công: dry-run trước, apply riêng

1. Từ apps/api chạy `npm.cmd run admin:bootstrap -- --dry-run --email <email-chủ-đã-chỉ-định>`.
2. CLI đọc PostgreSQL trong transaction READ ONLY, hiển thị email/User ID/role/isActive/emailVerifiedAt và các ADMIN đang tồn tại. Không hiển thị password/hash/token hoặc secret. Không có `--apply` thì luôn chỉ xem trước.
3. Nếu decision là READY_TO_PROMOTE, người vận hành kiểm tra đích rồi tự chạy applyCommand được in ra. Apply yêu cầu --apply --approved --email --user-id --expected-role, không chỉ --approved.
4. Transaction apply có advisory lock, kiểm tra lại identity/active/verified/ADMIN hiện hữu và role dự kiến, chỉ cập nhật role của đúng ID/email. Audit receipt và thay đổi role cùng commit hoặc cùng rollback. Không tạo User, đổi mật khẩu, verified hộ hoặc sửa Order/Product/Cart/Payment.
5. CLI kiểm tra role ngay trong transaction và đọc lại sau commit. Chạy lại đúng lệnh trên tài khoản đã ADMIN trả NOOP_ALREADY_ADMIN, không thêm audit trùng hoặc sửa tài khoản khác. ADMIN khác đã tồn tại sẽ chặn bootstrap bổ sung.
6. Sau khi apply thành công, đăng xuất rồi đăng nhập lại qua giao diện. Kiểm tra GET /api/auth/me với cookie thật trả ADMIN; API /api/admin/users cho phép ADMIN. Các tài khoản CUSTOMER/STAFF thật, active và đã xác minh phải bị chặn 403. Không dùng tài khoản/token giả để chứng minh.
7. Kiểm tra thuộc tính cookie trong DevTools (HttpOnly; Secure khi production HTTPS; SameSite=Lax), không sao chép giá trị cookie/token ra chat. Sau logout, /api/auth/me phải trả 401; refresh cookie bị xóa và session family bị revoke. Thiếu tài khoản STAFF thật thì ghi nhận chưa kiểm chứng, không tự tạo/đổi role fixture.

Trong lượt chuẩn bị này chỉ chạy dry-run. Apply và kiểm thử sau cấp quyền chưa được thực hiện.