# ADR-0001 — Baseline dữ liệu và luồng BrewLite

Ngày: 2026-11-07 · Trạng thái: nội dung theo quyết định người yêu cầu; chờ review baseline của nhóm. Không có commit/PR approval được ghi nhận ở P0. Liên quan: BL-REQ-01/02/03, [RTM](../../traceability-matrix.md).

## Bối cảnh

16 bảng hiện tại đã chứa catalog, cart, order/payment mẫu và Auth; còn thiếu liên kết tùy chọn giỏ, reservation, concurrency, payment event và lịch sử thao tác. SRS cũ mô tả điện thoại/OTP sandbox; yêu cầu mới dùng email/Gmail/bcrypt. Tồn Product, điểm 1.000đ trong code và role MANAGER không đồng bộ thiết kế mục tiêu.

## Quyết định

| ID | Quyết định |
| --- | --- |
| DEC-01 | Giữ Next.js/NestJS/PostgreSQL/Prisma/Docker và 16 bảng, không sửa migration đã áp dụng. |
| DEC-02 | Size là biến thể duy nhất của Product; Size.id là SKU. Thêm onHand, reserved, isAvailable; onHand NULL nghĩa là UNINITIALIZED và không thể đặt. Không tạo ProductSKU. |
| DEC-03 | Chỉ bổ sung CartItemTopping, OrderReservation, OrderStatusHistory, IdempotencyRecord, PaymentEvent nếu lúc triển khai vẫn chưa có cấu trúc tương đương. |
| DEC-04 | CUSTOMER/STAFF/ADMIN; MANAGER legacy chỉ mapping theo danh sách được duyệt. Public register luôn CUSTOMER. ADMIN chỉ giám sát đơn, không pha chế. |
| DEC-05 | Email + password bcrypt trước OTP; OTP Gmail 6 số, 5 phút, 5 lần thử, cooldown 60 giây, tối đa 3 lần gửi/15 phút/email và rate limit IP. |
| DEC-06 | Access JWT 15 phút; refresh opaque 7 ngày tuyệt đối, hash DB, rotation và phát hiện reuse; logout revoke server + clear hai HttpOnly cookies. |
| DEC-07 | Cấu hình giỏ = productId + sizeId + toppingIds sắp xếp + note chuẩn hóa. Merge sau login idempotent, không mất local hoặc âm thầm bỏ tùy chọn. |
| DEC-08 | Decimal VND nguyên; API money là chuỗi nguyên. Giữ /api/cart/calculate; quote không giữ tài nguyên. Backend reprice/reserve ở transaction tạo Order. |
| DEC-09 | Một coupon, cap 50% subtotal; 100đ/điểm, cap 20% after-coupon; EARN floor(payable/10000) chỉ khi COMPLETED. |
| DEC-10 | Order PENDING_PAYMENT→PAID→PREPARING→READY→COMPLETED; cancel pending hợp lệ. Payment nhiều attempts, PENDING/SUCCESS/FAILED/UNKNOWN. |
| DEC-11 | Giữ đơn 10 phút, tối đa 3 attempts; UNKNOWN phải reconcile trước retry/cancel; reserve/consume/release và reward đúng một lần. Không giữ DB transaction khi chờ gateway. |
| DEC-12 | Bootstrap ADMIN qua công cụ CLI local có kiểm soát, sau email verification và approval tài khoản; không có public elevate API hoặc tự nâng mọi MANAGER. |

## Thay đổi yêu cầu bảo mật còn chờ duyệt

**CR-SEC-01 — bcrypt trực tiếp và mật khẩu Unicode.** SRS 1.0 yêu cầu hỗ trợ tối thiểu 64 ký tự; bcrypt trực tiếp chỉ xử lý tối đa 72 byte đầu vào. Đề nghị: tối thiểu 15 Unicode code points, tối đa 72 byte UTF-8, từ chối vượt giới hạn, không truncate/normalize mật khẩu. 64 ký tự ASCII có thể dùng; không thể hứa 64 ký tự Unicode tùy ý. Đây là thay đổi acceptance/security requirement, không chỉ sửa validation. Backend/QA/Product phải review và ghi quyết định vào PR trước khi tuyên bố FR-30 đạt. Không tự đổi thuật toán pre-hash trong P1 để né vấn đề.

## Hệ quả và phương án không chọn

- Không cần bảng SKU mới vì Size đã gắn Product; nếu có thêm chiều biến thể trong tương lai thì phải ADR mới.
- Giữ stockQuantity chỉ hỗ trợ chuyển đổi, không chạy hai nguồn tồn độc lập.
- Không dùng số tiền client; không coi quote là cam kết hàng.
- Không dùng JWT 7 ngày thay cho refresh; không chỉ xóa cookie khi logout.
- Không hard-delete catalog đã có order; snapshot giữ lịch sử.
- SRS/RTM cũ phải đánh dấu các acceptance thay đổi, không đổi chữ Planned thành Passed chỉ do bổ sung tài liệu.

## Gate trước implementation

1. Review baseline và CR-SEC-01; tài liệu nguồn Assignment/UML thiếu được ghi ở checklist.
2. Chốt kế hoạch dữ liệu: người phân bổ onHand, danh tính ADMIN, cách xử lý cart legacy.
3. Tách PR P1/P2; AuthSession thuộc P1, migration cart/inventory thuộc P2; review thứ tự migration giữa hai nhánh.
4. Không tự tạo bảng thứ sáu hoặc mở rộng nghiệp vụ nếu không có ADR/đánh giá ảnh hưởng.