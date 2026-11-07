# Auth/session specification — P1 target

Theo [ADR](adr/0001-p0-baseline.md). Đây là contract cần triển khai, không phải trạng thái code đã hoàn thành. [authentication.md](authentication.md) ghi hướng dẫn local/code hiện tại.

## As-Is → target

| Nội dung | Code hiện tại | P1 |
| --- | --- | --- |
| Identity | Email canonical + bcrypt | Giữ; cập nhật SRS khỏi điện thoại |
| OTP | 6 số, 10 phút, 5 attempts, cooldown 60 giây | TTL 5 phút; max 3 gửi/15 phút/email, thêm IP limits |
| Access | JWT HS256 15 phút, phiên thu hồi | Giữ issuer/audience/exp và kiểm tra account/session |
| Refresh | Chưa có | Opaque random >=256 bit, hash DB, 7 ngày tuyệt đối, rotation/reuse detection |
| Login throttle | Code hiện giới hạn IP theo phút | Tối đa 10 lần sai/15 phút theo account+IP; giới hạn IP tổng để chống đổi account |
| Roles | Có MANAGER và ADMIN | Target ba role, mapping legacy riêng; cart CUSTOMER-only |
| SMTP | Có Gmail TLS transport | Cần credentials local và bằng chứng email thật, không coi mock là Gmail đã thử |

## Registration và OTP

- POST register chỉ nhận fullName/email/password. Email trim+lowercase; unique ở DB sau kiểm tra dữ liệu collision. Không lower/trim/normalize mật khẩu.
- Hash password bằng bcrypt cost 12; account chỉ login khi isActive và emailVerifiedAt có giá trị. User tồn tại nhưng chưa verified không được cấp session.
- OTP sinh bằng crypto, không trả JSON/log hoặc hiển thị OTP cho khách. Chỉ lưu hash, expiresAt, attempts, sentAt; TTL tính UTC.
- Reserve lần thử atomically trước so sánh; tối đa 5 kể cả request đồng thời; consume đúng một lần. Mã cũ vô hiệu khi resend thành công.
- Resend cooldown 60 giây và quota 3 gửi/15 phút/email, có giới hạn IP; bộ đếm production nhiều replica phải có storage dùng chung. OTP sai/hết hạn/đã dùng trả lỗi chung.
- Lỗi SMTP không được báo đã xác minh/gửi thành công giả; cho khách gửi lại có kiểm soát sau khi dịch vụ phục hồi.
- Gmail SMTP dùng App Password trong .env, TLS certificate verification mặc định. Không yêu cầu secret trong chat/source.

## CR-SEC-01 — người yêu cầu phê duyệt ngày 07/11/2026

SRS 1.0 yêu cầu hỗ trợ tối thiểu 64 ký tự. Bcrypt trực tiếp có giới hạn 72 byte, nên 64 ký tự Unicode bất kỳ có thể vượt giới hạn.

Người yêu cầu đã phê duyệt thay AC-30: ít nhất 15 Unicode code points, tối đa 72 byte UTF-8, có thông báo rõ khi vượt; chấp nhận 64 ASCII, không hứa 64 Unicode tùy ý. Không truncate, không tự thêm pre-hash hay đổi thuật toán. Kiểm tra mật khẩu yếu theo yêu cầu SRS vẫn cần policy/test, không đánh dấu đã thực hiện vì có bcrypt. Phê duyệt được ghi nhận từ chỉ dẫn trực tiếp trong phiên làm việc. Chưa có chữ ký review độc lập Backend/QA/Product hay bằng chứng nghiệm thu toàn hệ thống.

Tests: 14/15 code points; 64 ASCII; đúng 72 và 73 byte; tiếng Việt/emoji; không bị hai password khác hậu tố vượt 72 byte coi như giống nhau; không log raw password.

## Access, refresh và session family

- Access JWT chứa sub và sid, issuer/audience; hạn 15 phút. Không tin role chỉ do client hoặc claim cũ: kiểm tra User/phiên ở server.
- Refresh token opaque ngẫu nhiên; hash SHA-256 phù hợp cho token entropy cao (khác password bcrypt). Không trả token trong JSON. Refresh cookie đặt từ server.
- AuthSession mỗi thế hệ là một row với id, userId, familyId, parentId unique, refreshTokenHash unique, refreshUsedAt, expiresAt, revokedAt. Không thêm RefreshToken table.
- Lần login tạo family có expiresAt=login+7 ngày. Rotation tạo child cùng hạn tuyệt đối, không reset thêm 7 ngày mỗi lần.
- Refresh transaction: tìm hash, kiểm tra account/expiry/revoked/used; conditional mark parent consumed và tạo đúng một child; đặt hai cookie mới sau commit. Parent không tiếp tục cấp quyền; JWT cũ có thể nhận 401 sau rotation.
- Giữ consumed hash đến hết cửa sổ bảo mật để phát hiện reuse; không xóa ngay. Token cũ bị phát lại → revoke family, clear cookies, 401 REFRESH_REUSED. Không tự chấp nhận hai lần refresh thành công.
- Frontend single-flight refresh, phối hợp giữa tab nếu cần; retry request ban đầu một lần. Không interceptor-refresh đệ quy ở auth endpoints. Hết refresh → yêu cầu login, giữ giỏ.
- Logout tìm/revoke family qua refresh cookie kể cả access đã hết hạn; không chỉ dựa authenticate(access). Clear cả hai cookie; replay token sau logout bị từ chối.
- Legacy AuthSession chưa có refresh hash không được backfill raw token hoặc tự kéo dài phiên. Yêu cầu login mới khi hết phiên.

## Cookies, CORS, CSRF

| Cookie | Target |
| --- | --- |
| brewlite_session | HttpOnly; path=/api; Max-Age=900; Secure production HTTPS; SameSite=Lax cho cùng site |
| brewlite_refresh | HttpOnly; path=/api/auth; hạn còn lại của family, tối đa 7 ngày; Secure/SameSite tương ứng |

Clear phải dùng cùng path/domain/secure/sameSite như set, không truyền maxAge cũ. Không domain wildcard hoặc tùy tiện SameSite=None. Deploy cùng site qua HTTPS; cross-site là thay đổi kiến trúc cần review CSRF/cookie riêng.

Axios withCredentials=true; CORS origin cụ thể từ cấu hình, credentials=true, không wildcard. OriginGuard kiểm tra allowlist cho auth/refresh/logout và mọi mutation được bảo vệ, kể cả same-site; request thiếu/sai Origin bị từ chối. CLI test phải gửi Origin hợp lệ. Không dựa CORS một mình để chống CSRF.

## Bootstrap và quyền

Theo [RBAC](rbac-matrix.md). Public register CUSTOMER. Bootstrap demo là CLI riêng, account đã xác minh, review identity, environment allowlist, transaction và receipt; không có public endpoint nâng role. ADMIN không được update trạng thái pha chế hay payment outcome.

## Acceptance P1

- Mail thật tới hộp thư test được cho phép; OTP đúng/sai/hết hạn/reuse/resend race; không lộ mã.
- Bcrypt lưu hash, credentials sai không có cookie; không verified/disabled không login.
- Refresh một lần, rotation/replay, concurrent requests, hết 7 ngày, logout khi access hết hạn; token cũ không dùng được.
- Cookie headers đúng HTTP dev/HTTPS production; CSRF origin sai, CORS credentials, không token trong web storage/JSON.
- Role/ownership HTTP trực tiếp, bootstrap chưa verified/duplicate/production; không nâng mọi MANAGER.
- CR-SEC-01 phải có quyết định review; pass unit không thay bằng chứng Gmail/browser cookie thật.