# BrewLite — Acceptance Test Cases (thiết kế kiểm thử, chưa thực thi)

**Bản:** 1.0.0 · **Status:** `Planned`, không được ghi `Passed` cho đến khi chạy và có log/screenshots/CI link.  
**Test IDs:** TC = functional/UAT; INT = integration/data; SEC = security; PERF = performance; UX = usability; DEP = deployment; OPS = operations; QA = release; DATA = schema.

## A. Functional / UAT

| Test | Preconditions | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| TC-01 | Số test chưa đăng ký, OTP sandbox được bật có allowlist | Đăng ký → lấy OTP hợp lệ → xác nhận → thiết lập password từ 15 ký tự, cho phép tối thiểu 64 ký tự | Account được kích hoạt duy nhất; OTP sai/hết hạn/replay từ chối; login thành công sau khi có mật khẩu |
| TC-02 | Có CUSTOMER, STAFF, OWNER; session hợp lệ | Login đúng/sai, refresh và logout; dùng refresh cũ lại | Token chỉ cấp khi đúng, refresh rotation hoạt động, logout revoke, access/role hợp lệ |
| TC-03 | Anonymous có giỏ 1 món | Nhấn đặt hàng, login, trở lại checkout | Trước login không có order; giỏ không mất; sau login có thể tiếp tục |
| TC-04 | Seed 100 products có active, hidden, hết hàng | GET menu/detail; ngắt API; kiểm tra loading/empty/error | API đúng fields; ẩn trả 404; UI thể hiện các trạng thái; món hết hàng không thêm giỏ |
| TC-05 | 1 sản phẩm SKU 40.000 + topping 10.000, qty=2 | Thêm/đổi giỏ, cố sửa `unitPrice` trong request checkout | Tổng chính xác 100.000; server bỏ qua giá client; snapshot không đổi sau khi chỉnh giá catalog |
| TC-06 | Subtotal 100.000; coupon 10%; coupon expired; coupon limit reached | Thử coupon hợp lệ rồi các mã sai | Giảm 10.000; coupon invalid báo đúng; không tiêu quota khi payment fail; giới hạn 1 mã |
| TC-07 | Subtotal 100.000, coupon 10%, balance 120 điểm | Dùng 100 điểm; thử 200 điểm | Thanh toán 80.000; 200 điểm bị từ chối (vượt balance/cap); sau fail số điểm không trừ |
| TC-08 | SKU còn 0 / 1; hai giỏ cùng đặt | Đặt SKU hết; sau đó cho 2 khách tạo đơn đồng thời với 1 SKU cuối | Hết hàng 409 và không tạo payable order; đồng thời chỉ 1 thành công |
| TC-09 | Customer auth, 1 giỏ hợp lệ, Idempotency-Key K1 | POST order 2 lần K1 cùng payload, rồi K1 khác payload | Một order duy nhất cho payload giống; khác payload 409; đã giữ chỗ đúng 1 lần |
| TC-10 | PENDING_PAYMENT có reservation SKU 2, coupon, 100 điểm | Mock SUCCESS gửi callback lặp 2 lần | Một `PAID`, quantity sold 2, điểm/coupon consume một lần, khách nhận mã đơn |
| TC-11 | PENDING_PAYMENT | Mock wallet SUCCESS; mock card FAILED; mock network UNKNOWN | Trả đúng attempt status; không dùng thẻ tiền thật; UNKNOWN hiển thị “Đang xác minh” |
| TC-12 | Pending; payment failed; 3 attempts max; 10m TTL | Retry với key mới, hủy; hết TTL trên order khác | Không tạo order khác; >3 attempts từ chối; cancel/expiry release một lần; không trừ code/point |
| TC-13 | 2 customer có order riêng | Xem kết quả, history, filter bằng token A vào order B | Khách A thấy mã/trạng thái của A, không thấy bất kỳ order B |
| TC-16 | Có STAFF, đơn PAID và đơn PENDING_PAYMENT | STAFF xem queue và cập nhật PAID→PREPARING→READY→COMPLETED; thử nhảy trạng thái | Không hiện PENDING; chuyển tuần tự được; nhảy/lùi 409; khách đọc được status mới |
| TC-17 | Order PAID 80.000, chưa hoàn thành | Mark COMPLETED 2 lần | Được cộng 8 điểm **một lần**; order cancelled không cộng |
| TC-18 | OWNER/STAFF/CUSTOMER | OWNER tạo/sửa/ẩn sản phẩm, promo, user; CUSTOMER/STAFF truy cập các route này | OWNER thành công; role khác 403; history order không đổi giá cũ |

## B. Integration / Reliability

| ID | Kịch bản và điều kiện pass |
|---|---|
| INT-05 | SKU `on_hand=1,reserved=0`: 2 transaction đặt đồng thời; chính xác 1 order giữ hàng, tổng reserved ≤1; rollback để nguyên số lượng khi thiếu hàng. |
| INT-06 | User balance=100 điểm: 2 đơn đồng thời định dùng 100 điểm; chỉ 1 có thể reserve, tổng `reservedPoints + spentPoints ≤ 100`. |
| INT-07 | Coupon quota remaining=1: 2 order đồng thời cùng coupon; chỉ 1 reserve, cancel giải phóng, paid consume 1. |
| INT-08 | Duplicate POST /orders hoặc /payments cùng key/payload; response logic không đổi; same key/different payload=409; không double side effect. |
| INT-09 | Mock callback events `e1`, `e1` (duplicate), `e2` out-of-order; backend dedupe provider event/payment IDs, không double pay hay double consume. |
| INT-10 | Payment timeout sau khi provider đã SUCCESS; API query status và xác nhận 1 lần; khi UNKNOWN không cancel/repay tùy tiện; late SUCCESS cho CANCELLED được flag/reconciliation chứ không hồi sinh. |

## C. Security / UX / Quality / Operations

| ID | Kịch bản và pass condition |
|---|---|
| SEC-01 | Public GET menu chạy; protected endpoint thiếu JWT=401; role không đủ=403; cross-owner order denied, thay `userId` body không thay ownership. |
| SEC-02 | Token hết 15m, refresh 7d, rotation/reuse/logout revoke; không lưu password plaintext; password hash theo OWASP. |
| SEC-03 | OTP TTL5m, cooldown60s, max3/15m, max5 attempts, one-time-use; login throttling, thông báo chung; không lộ OTP trên public/log. |
| PERF-01 | 2 vCPU/4GB; 100 products/1000 orders; 20 VUs ×5min, warm-up2min: p95 GET /products ≤2s và unexpected error ≤1%. |
| PERF-02 | Cùng điều kiện; p95 POST /orders ≤3s không tính provider mock delay; unexpected error ≤1%. |
| UX-01 | 360,375,768,1280px viewport; no overflow, keyboard-only có thể hoàn tất checkout; input và feedback rõ. |
| UX-02 | Target WCAG2.2 A/AA cho luồng chính: label, focus, contrast, error; axe no critical và manual keyboard pass; nếu fail không claim conform. |
| UX-03 | Loading/empty/error hiển thị đúng; disable double-submit; UNKNOWN nêu “Đang xác minh”, không tự báo FAIL/SUCCESS. |
| DEP-01 | `docker compose up --build` + clean migration/seed + GET menu và /health chạy trên máy mới. |
| DEP-02 | URL frontend/API HTTPS truy cập; DB private; CI secrets không có trong repo/log; migration an toàn. |
| QA-01 | Unit pricing/coupon/points, integration order/payment, ≥1 E2E menu→PAID→status đều pass ở CI. |
| QA-02 | PR lỗi lint/test/build không merge; release pipeline có image tag, deploy, health/smoke, rollback manual documented. |
| QA-03 | Repo có docs, nguồn diagrams và SVG/PNG, ADR, matrix, README, .env.example và trace commits. |
| OPS-01 | Request log có id/status/latency nhưng không chứa JWT/OTP/secret; `/health` không lộ db credentials. |
| OPS-02 | 120 probes/60 phút sau warm-up; >=119 probes success (99% rounding) và ghi sample timestamps. |
| OPS-03 | Audit changes trên menu, promo, role, payment, status chứa actor/time/resource và không lộ secret. |
| DATA-01 | VND integer; timestamp UTC; DB constraints; order line giữ giá snapshot qua sửa catalog. |

## D. Chứng cứ/biên bản nghiệm thu (để điền sau chạy thật)

| Test ID | Environment / Git SHA | Expected | Actual | Pass/Fail/Blocked | Evidence link | Tester / Date |
|---|---|---|---|---|---|---|
| TC-10 | *Chưa chạy* | PAID và consume đúng 1 lần | — | Planned | — | — |
| INT-05 | *Chưa chạy* | Không oversell | — | Planned | — | — |
| PERF-01 | *Chưa chạy* | p95 ≤ 2s | — | Planned | — | — |

**Không ký biên bản “đạt” khi chưa có Actual/Evidence.** Các TC/INT/SEC có thể chuyển thành Jest/Supertest/Playwright/k6 theo Sprint 1–2.
