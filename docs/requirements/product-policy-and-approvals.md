# BREWLITE — PRODUCT POLICY, DECISION RECORD & APPROVALS

**Mã tài liệu:** BL-REQ-03 · **Phiên bản:** 1.1.0 P0 · **Ngày:** 07/11/2026
## 1. Quy tắc quản lý quyết định

- **Nguồn [A]** = Assignment 2; **[U]** = use-case/activity/use-case overview do nhóm cung cấp; **[D]** = thiết kế cụ thể hóa do người soạn đề xuất; **[S]** = tham chiếu chuẩn/thông lệ, không phải mệnh lệnh đặt ra chỉ tiêu kinh doanh.
- Các giá trị [D] được dùng **nhất quán** trong SRS, test cases và sơ đồ mẫu. Chỉ người đại diện sản phẩm/nhóm có quyền chấp thuận chính thức. Không ghi “approved” nếu không có issue/PR review.
- Khi đổi một SP, cập nhật SRS (`FR`, `BR`, `NFR`), use-case, activity, sequence, class, tests, ma trận truy vết và history bằng pull request.

## 2. Sổ quyết định nghiệp vụ phiên bản 1.0

| ID | Quyết định cho bản thiết kế | Nguồn | Lý do và cách kiểm thử |
|---|---|---|---|
| SP-01 | **01 cửa hàng; nhận tại quầy; không giao hàng** | [U],[D] | Thống nhất luồng nhân viên pha chế; TC-16 |
| SP-02 | Khách xem menu/giỏ không cần login; bắt buộc xác thực trước tạo đơn | [U] | E1/A1 của UC 1.3; TC-03 |
| SP-03 | Email canonical + password bcrypt khi đăng ký → Gmail OTP → xác minh email → được login bằng email/password. Public register chỉ CUSTOMER; không tự verified tài khoản seed. CR-SEC-01: tối thiểu 15 Unicode code points và tối đa 72 byte UTF-8 thay yêu cầu 64 Unicode cũ, người yêu cầu phê duyệt ngày 07/11/2026; không truncate. | Quyết định người yêu cầu, ADR-0001; CR phê duyệt bởi người yêu cầu | TC-01/02, Gmail thật tách mock; không còn set-password sau OTP |
| SP-04 | OTP6 số TTL5 phút, max5 thử, cooldown60s, max3 gửi/15 phút/email và giới hạn IP; hash, consume atomic một lần; không log/trả OTP cho client. | Quyết định P0 | SEC-03: sai/hết hạn/reuse/concurrent/resend và mailbox thật |
| SP-05 | JWT access **15 phút**; refresh token **7 ngày**, luân phiên và thu hồi khi logout; kiểm tra phiên/revocation server | [D] tham chiếu [S] | Tránh phát biểu không đúng rằng xóa token ở client đủ để revoke JWT; SEC-02 |
| SP-06 | Decimal giữ kiểu cột chuyển đổi, enforce VND nguyên; API chuỗi số nguyên; UTC trong DB, Asia/Ho_Chi_Minh ở UI. Snapshot giá khi Order, không tin tiền client. | Quyết định P0 | TC-05; không floating-point cộng tiền hoặc silently round dữ liệu cũ |
| SP-07 | Một checkout dùng **tối đa 01 coupon** cộng điểm thưởng. Coupon cố định hoặc %; % từ 1–50, coupon giảm **không quá 50% subtotal**; điều kiện min basket theo cấu hình; code dùng đúng 1 lần/khách nếu cấu hình | [D] cụ thể hóa [U] | Quy tắc xác định, không phát sinh đơn 0đ; TC-06 |
| SP-08 | Điểm quy đổi **1 điểm = 100 VND**; dùng số điểm nguyên; giới hạn quy đổi **≤20% giá trị còn lại sau coupon**; tích điểm **1 điểm / 10.000 VND đã thanh toán**, làm tròn xuống, ghi khi `COMPLETED` | [D] cụ thể hóa [U] | Tách đổi điểm và tích điểm; TC-07, TC-17 |
| SP-09 | Thứ tự tính: `subtotal` → `couponDiscount` → `redeemValue` → `payable`; mọi bước do API tính với VND nguyên, làm tròn giảm giá phần trăm xuống đồng; không thêm thuế/ship trong MVP | [D],[S] | Công thức duy nhất, TC-05–07 |
| SP-10 | Size.id là SKU, Size thuộc Product; onHand/reserved/isAvailable; available=onHand-reserved. onHand NULL chưa phân bổ và không thể đặt. Không ProductSKU, không nhân tồn Product cho mỗi Size; stockQuantity legacy đến switch. | Quyết định P0 | INT-05, migration allocation được duyệt |
| SP-11 | Tạo đơn `PENDING_PAYMENT`: **atomic reservation** của SKU, coupon quota và điểm; không trừ điểm/đánh dấu mã đã dùng. `PAID`: chuyển reservation sang tiêu thụ. Hủy/hết hạn: **release** reservation một lần | [D] để thống nhất postcondition [U] | Tránh oversell và double spend; INT-05–08 |
| SP-12 | Đơn chờ thanh toán hết hạn sau **10 phút** kể từ tạo; tối đa **3 payment attempts**/đơn. Khách được retry khi attempt `FAILED` với **key mới**; retry mạng của *cùng attempt* giữ **key cũ** | [D] | Tách retry nghiệp vụ và retry kỹ thuật; TC-11/12 |
| SP-13 | `POST /orders` và `POST /payments` yêu cầu Idempotency-Key, phạm vi theo actor+operation+payload fingerprint; cùng key+same payload trả cùng kết quả logic, khác payload trả `409`; lưu key ≥24 giờ; kết quả payment event phải dedupe bằng `provider_event_id`/`provider_payment_id` unique | [D],[S] | HTTP POST mặc định không idempotent; INT-08/09 |
| SP-14 | Nếu payment timeout/chưa rõ, đặt payment attempt `UNKNOWN`, query status; **không tự đánh dấu FAILED hoặc tạo payment mới**. Hết 10 phút chỉ cancel nếu xác nhận không có thành công; late success được đánh dấu cần xử lý, không âm thầm chuyển đơn đã hủy thành PAID | [D],[S] | Tránh xác nhận sai trạng thái và trừ hàng hai lần; INT-10 |
| SP-15 | Order PENDING_PAYMENT→PAID→PREPARING→READY→COMPLETED; pending→CANCELLED hợp lệ. STAFF mới chuyển pha chế, ADMIN chỉ giám sát. Payment PENDING/SUCCESS/FAILED/UNKNOWN tách Order, mapping INITIATED/SUCCEEDED cũ. | Quyết định P0 | TC-13–17; không hủy/refund sau PAID trong MVP |
| SP-16 | Thông báo in-app (trang kết quả và xem trạng thái), **không hứa** SMS/push; nhân viên chỉ thấy đơn `PAID` trở đi; quản lý được quyền quản trị qua backend RBAC | [U],[D] | Tránh mở rộng ngoài phạm vi; TC-16 |

### 2.1 Công thức chuẩn và phép thử mẫu

- `subtotal = Σ [(basePrice(product, size) + Σ toppingPrice) × quantity]`.
- `couponDiscount = min(couponRawDiscount, floor(subtotal × 0.50))`, với `couponRawDiscount = fixedAmount` hoặc `floor(subtotal × percent / 100)`; chỉ dùng khi đủ mọi điều kiện.
- `afterCoupon = subtotal − couponDiscount`.
- `redeemPoints ≤ min(balancePoints − reservedPoints, floor((afterCoupon × 0.20) / 100))` (điểm nguyên). `redeemValue = redeemPoints × 100`.
- `payable = afterCoupon − redeemValue` (VND nguyên). Số không âm và với `subtotal > 0`, `payable > 0` theo chính sách giới hạn.
- `earnedPoints = floor(payable / 10_000)` **một lần** khi đơn hoàn thành, sau khi đã thanh toán thành công.

**Preview giá:** `POST /api/cart/calculate` là thao tác đọc/tính tiền **không giữ hàng, không tạo đơn**; `POST /orders` luôn kiểm tra lại giá và tồn kho trước khi commit.

**Ví dụ kiểm chứng:** 2 món × 50.000 = 100.000 VND; coupon 10% = 10.000; sau coupon 90.000; khách dùng 100 điểm = 10.000 VND (giới hạn 20% = 18.000); `payable = 80.000 VND`; đơn hoàn thành tích 8 điểm. Nếu thanh toán thất bại/hủy: không bị trừ 100 điểm, không tiêu coupon, không phát sinh 8 điểm tích lũy.

### 2.2 Thanh toán và tồn kho — quy tắc transaction

1. NestJS xác thực JWT/quyền, validate giỏ, tùy chọn, coupon, điểm, price và SKU server-side.
2. PostgreSQL transaction khóa/atomic-update SKU, quota coupon và điểm; tạo order snapshot + reservations + expiry. Nếu bất kỳ kiểm tra nào thất bại thì **rollback toàn bộ**.
3. Gửi thanh toán ra cổng giả lập **sau khi commit** transaction tạo đơn (không giữ DB lock khi chờ mạng); trạng thái attempt lưu riêng. Callback/response được xác minh bằng payment ID, order ID, amount, event ID từ nguồn mô phỏng đáng tin cậy.
4. Thành công: transaction xác nhận order chưa thanh toán, duy nhất hóa payment, `on_hand -= qty; reserved -= qty` (bán), điểm/coupon `reserved → consumed`, status `PAID`, tạo in-app event. Duplicate event trả no-op.
5. Thất bại rõ ràng: order vẫn PENDING_PAYMENT trong TTL, giữ reservations để có thể retry; khách có thể hủy để giải phóng. Hết hạn và không có UNKNOWN chưa giải quyết: cancel/release; cùng kết quả nếu worker chạy lại.
6. UNKNOWN: hỏi lại provider/status; không tự tạo lần charge khác hoặc cancel nếu còn giao dịch chưa được xác định. Với mock-provider, seed scenario cho success/fail/timeout/late-event để test.

## 3. Sổ chuẩn/tham chiếu (không trích nguyên văn văn bản có bản quyền)

- [STD-01] ISO/IEC/IEEE 29148:2018 — cấu trúc và chất lượng yêu cầu: https://www.iso.org/standard/72089.html
- [STD-02] ISO/IEC 25010:2023 — đặc tính chất lượng: https://www.iso.org/standard/78176.html
- [STD-03] OWASP ASVS 5.0.0 — tham chiếu lựa chọn yêu cầu kiểm thử an ninh, **không tuyên bố ASVS-certified**: https://asvs.owasp.org/
- [STD-04] W3C WCAG 2.2 — mục tiêu kiểm thử A/AA cho luồng cốt lõi, **không tuyên bố toàn hệ thống đã conform nếu chưa audit**: https://www.w3.org/TR/WCAG22/
- [STD-05] RFC 9110 — ý nghĩa idempotency theo HTTP: https://www.rfc-editor.org/rfc/rfc9110.html
- [STD-06] IETF draft `draft-ietf-httpapi-idempotency-key-header` — **Internet-Draft chưa phải RFC tiêu chuẩn**, chỉ tham khảo thiết kế Idempotency-Key: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- [STD-07] OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- [STD-09] NIST SP 800-63B-4 (mật khẩu một yếu tố tối thiểu 15 ký tự, không ép complexity rules): https://pages.nist.gov/800-63-4/sp800-63b.html
- [STD-08] OWASP Business Logic Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html

## 4. Review / ký nhận (không ghi khống)

| Vai trò cần duyệt | Nội dung | Trạng thái | Bằng chứng |
|---|---|---|---|
| Đại diện Product Owner / Chủ cửa hàng | SP-01, SP-06…SP-16, in/out scope | Chưa xác nhận | Điền PR/issue URL + ngày sau review |
| Đại diện Backend / Tech Lead | SP-03…SP-05, SP-10…SP-15, khả năng triển khai | Chưa xác nhận | Điền PR/issue URL + ngày |
| Đại diện Frontend / UX | Checkout, trạng thái, login, errors, a11y | Chưa xác nhận | Điền PR/issue URL + ngày |
| QA / người chịu trách nhiệm test | Acceptance criteria và test data | Chưa xác nhận | Điền PR/issue URL + ngày |
| Giảng viên | Chấm/nhận xét theo Assignment 2, nếu có | Chưa xác nhận | Không tự suy diễn chữ ký |

**Quy trình đề xuất:** tạo issue `BL-BASELINE-001: Approve product policies for Task 1.1/1.2`, đính kèm 2 tài liệu + link sơ đồ, reviewers comment, người phụ trách merge PR. Khi đó tăng phiên bản thành `1.1.0-approved` hoặc giữ `1.1.0` nhưng thay metadata trạng thái bằng link duyệt thực tế.

## 5. Điểm lệch giữa bản UML đã gửi và chính sách thống nhất

| Mã | Hiện trạng | Cập nhật yêu cầu |
|---|---|---|
| IMP-01 | Use-case overview chưa có Xem thực đơn, Xem chi tiết, Theo dõi đơn tách bạch | Bổ sung vào tổng quan và gắn FR-01/02/21; có bản `.puml` mẫu đi kèm |
| IMP-02 | UC 1.3 bước 8 tạo đơn chờ; bước 10 mới trừ kho nhưng hậu điều kiện thất bại nói "giải phóng hàng giữ chỗ" | Viết rõ **giữ chỗ ở bước 8**, chuyển thành trừ/bán ở bước 10; hủy/TTL giải phóng |
| IMP-03 | Mã/điểm chưa có công thức và thời điểm trừ | SP-07/08/09/11 với reservation, sample và test |
| IMP-04 | Activity: nhánh thanh toán thất bại/hủy/đơn tiếp tục; thiếu timeout/UNKNOWN | Thêm condition 10 phút và truy vấn trạng thái trước khi hủy/retry |
| IMP-05 | Use-case Task1.3 vẽ "cập nhật đơn/gửi thông báo" `extend` vào Đặt hàng dù hoàn tất sau thành công là bắt buộc | Chuyển thành luồng sau thành công của Thanh toán/Đặt hàng, không là optional extension |
| IMP-06 | UC overview vẽ quản lý người dùng/khuyến mãi/thực đơn nhưng SRS cũ ưu tiên Should | Bản mới thống nhất Must nếu vẫn nằm trong phạm vi bản demo cuối |
| IMP-07 | Đăng ký OTP và đăng nhập mật khẩu chưa có bước thiết lập mật khẩu | P0 thay bằng nhập email/password trước Gmail OTP; sửa UC/Activity nguồn theo checklist |
| IMP-08 | "Thanh toán thất bại" trộn vào trạng thái đơn | Tách payment attempt FAILED/UNKNOWN với order PENDING_PAYMENT |
| IMP-09 | Dùng điểm trong checkout không có cơ chế tích điểm | SP-08 thêm quy tắc tích điểm khi COMPLETED; demo có seed user với điểm ban đầu |

**Mọi sơ đồ đã có vẫn là bản thiết kế nhóm cung cấp, chưa tự động được sửa bởi việc soạn tài liệu này.** Chỉ sơ đồ tổng quan `.puml` trong bộ bàn giao là bản mẫu đồng bộ; hãy cập nhật nguồn Visual Paradigm/Draw.io của nhóm theo IMP-xx.

## 6. Baseline P0 và phê duyệt còn thiếu

Quyết định người yêu cầu ngày 07/11/2026 được ghi tại [ADR-0001](../architecture/adr/0001-p0-baseline.md). Review/sign-off nhóm ở mục 4 vẫn chưa có evidence, không tự chuyển thành Approved. Các giá trị 100đ/điểm, cap50%/20%, TTL10m và max3 attempts là chính sách thiết kế, không gán thành quy định cứng của giảng viên.

Bổ sung: giữ 16 bảng, thêm đúng 5 bảng có mục đích theo [database baseline](../architecture/database-baseline.md); CUSTOMER/STAFF/ADMIN, MANAGER legacy theo mapping; access15m/refresh7d và bootstrap theo [Auth](../architecture/auth-session-spec.md), [RBAC](../architecture/rbac-matrix.md). Quote không cam kết hàng, transaction Order phải reprice/reserve.

| Gate | Quyết định cần ghi nhận | Trạng thái |
| --- | --- | --- |
| CR-SEC-01 | 72 byte bcrypt trực tiếp thay khả năng 64 Unicode bất kỳ; acceptance/security change | Người yêu cầu phê duyệt ngày 07/11/2026; chưa có review độc lập Backend/QA/Product |
| DATA-ALLOC | Phân bổ onHand từng Size, tổng đối chiếu Product | Chưa có mapping được duyệt; không tự phân bổ |
| DATA-ADMIN | Danh tính ADMIN/bootstrap demo hoặc mapping đúng MANAGER | Chưa có tài khoản đích/approval; không tự nâng quyền |
| DATA-CART | CartItem thiếu size/topping cần khách cấu hình lại | Giữ nguyên, không gán mặc định |
| UML-SOURCE | Activity/Sequence/VP Class nguồn và Assignment PDF | Chưa có trong repo đã kiểm tra; không tuyên bố đã chỉnh |

IMP-xx và danh sách tham chiếu chuẩn ở trên là lịch sử/nguồn tham khảo; phần P0 mới thay thế mô tả phone/sandbox/OWNER cũ. Kết quả tests cũ không tự là nghiệm thu quyết định mới.