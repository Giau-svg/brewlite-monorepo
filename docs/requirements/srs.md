# BREWLITE — SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

**Mã tài liệu:** BL-REQ-02 · **Assignment:** 2 / Task 1.2  
**Version:** 1.0.0 — *review-ready candidate* · **Ngày:** 29/10/2026  
**Trạng thái:** Đặc tả hoàn chỉnh về nội dung nghiệp vụ/kiểm thử cho MVP được đề xuất; **chưa có chứng cứ stakeholder phê duyệt**.  
**Tài liệu liên quan:** `context-and-scope.md` (BL-REQ-01), `product-policy-and-approvals.md` (BL-REQ-03), `../traceability-matrix.md`, Task 1.3 UC Đặt và thanh toán, Activity Task 2.1, `../diagrams/usecase-overview.puml`.

## 1. Giới thiệu

### 1.1. Mục đích và người đọc

SRS mô tả **hành vi kiểm chứng được** của BrewLite: chức năng (`FR`), chất lượng (`NFR`), quy tắc nghiệp vụ (`BR`), API/interface ở mức hợp đồng, và tiêu chí nghiệm thu (`AC`). Người đọc: Product Owner, BA, FE, BE, QA, reviewer và giảng viên. Mã định danh ổn định phục vụ quản lý thay đổi và ma trận truy vết. Cấu trúc tham khảo ISO/IEC/IEEE 29148:2018, phân loại NFR tham khảo ISO/IEC 25010:2023; không tuyên bố toàn bộ quy trình đã được chứng nhận chuẩn.

### 1.2. Phạm vi

Ứng dụng một cửa hàng, nhận nước tại quầy, không thu tiền thật. Ba actor người dùng: Khách, Nhân viên và Chủ cửa hàng; actor hệ thống phụ: cổng thanh toán mô phỏng. Frontend Next.js mobile-first/PWA; Backend NestJS; PostgreSQL; Docker Compose và CI/CD đến production demo qua HTTPS.

### 1.3. Từ vựng

| Thuật ngữ | Định nghĩa |
|---|---|
| SKU | Biến thể bán được của một đồ uống theo `productId + sizeId`; có giá, on_hand và reserved |
| Order | Đơn hàng; snapshot các dòng món, số lượng, giá, ưu đãi, chủ sở hữu và trạng thái |
| Payment attempt | Một lần thực hiện thanh toán của một Order; có trạng thái riêng, không đồng nhất trạng thái Order |
| Reservation | Số lượng SKU, quyền dùng coupon hoặc điểm được giữ chỗ, chưa trừ/tiêu dùng thật |
| Idempotency-Key | Khóa gắn với một hành động tạo đơn hoặc một payment attempt; chống tác dụng phụ khi gửi lại mạng |
| MoSCoW | Must: bắt buộc; Should: nên có; Could: thêm nếu đủ nguồn lực; Won’t: loại khỏi release hiện tại |
| Acceptance Criteria (AC) | Điều kiện đầu vào và kết quả có thể kiểm tra bằng test/quan sát |
| Production demo | Môi trường triển khai truy cập qua HTTPS dành cho nghiệm thu môn học, không xử lý tiền hoặc danh tính SMS thật |

### 1.4. Quy tắc ưu tiên và thứ tự nguồn

**[A]** là điều kiện Assignment 2 bắt buộc, **[U]** là use-case/diagram nhóm đã xây dựng, **[D]** là quy tắc cụ thể hóa tại `product-policy-and-approvals.md`; không được xem các số 10 phút, 20 người dùng hoặc 100 VND/điểm là tham số chuẩn quốc tế. Các FR Must bên dưới là mục tiêu MVP **cuối Sprint 2**, không đồng nghĩa Sprint 1 phải có toàn bộ.

## 2. Mô tả tổng quan và ranh giới

### 2.1. Hoạt động chính

**Customer:** `Menu → Detail / Options → Cart → Checkout → Auth (nếu thiếu) → Coupon/Points (optional) → Server reprice → Stock check/reserve → PENDING_PAYMENT → Mock payment → Paid / Retry / Cancel → Order status / history`.  
**Staff:** `Login → View paid orders → PREPARING → READY → COMPLETED`.  
**Owner:** `Login → Manage products/SKU/menu, promotions, users/roles`.

### 2.2. Ngữ cảnh bên ngoài

1. Next.js hiển thị dữ liệu từ NestJS qua HTTPS; không dùng dữ liệu giá từ client để tạo giao dịch.
2. NestJS kết nối PostgreSQL qua mạng riêng, lưu order/attempt/reservation/loyalty events.
3. Mock Payment Service xử lý `SUCCESS`, `FAILED`, `TIMEOUT/UNKNOWN`, status inquiry; **không chấp nhận dữ liệu thẻ thật**.
4. OTP sandbox có test phone allowlist, không giả mạo việc gửi SMS thực; cần thay bằng nhà cung cấp đáng tin cậy nếu chuyển sang hoạt động thương mại.

## 3. Functional Requirements

**Quy ước:** Mọi yêu cầu Must phải đạt acceptance criteria tương ứng; `[SP-xx]` là chính sách cụ thể tại BL-REQ-03, `[TC-xx]` là test ở `tests/acceptance-test-cases.md`. Nhiều AC nêu dạng Given/When/Then rút gọn. Định danh FR từ bản trước được **giữ lại** khi có thể để giảm đứt trace.

### 3.1. Menu / sản phẩm

| ID | Mức | Yêu cầu hệ thống | Acceptance Criteria có thể kiểm chứng |
|---|---|---|---|
| FR-01 | Must | Hiển thị thực đơn sản phẩm đang bán cho khách chưa đăng nhập. | **AC-01:** `GET /products` trả list sản phẩm active với `id,name,basePrice,availableSizes,availability`; khi trống/timeout/error UI lần lượt hiển thị empty/error và có loading; không đưa sản phẩm đã ẩn vào danh sách. TC-04. |
| FR-02 | Must | Hiển thị chi tiết đồ uống. | **AC-02:** `GET /products/:id` trả tên/mô tả/size/topping/giá có thể chọn; ID không có hoặc ẩn trả 404 cho khách. TC-04. |
| FR-03 | Must | Khách chọn size, topping, số lượng; UI báo giá tạm tính. | **AC-03:** size bắt buộc trong danh sách hợp lệ; topping active; số lượng nguyên 1–20/dòng; khi đổi tùy chọn/tăng số lượng, subtotal đổi đúng; dữ liệu sai trả 400. TC-05. |
| FR-04 | Must | Chủ cửa hàng thêm/sửa/ẩn sản phẩm/SKU và trạng thái bán. | **AC-04:** OWNER thêm/sửa giá và trạng thái; thay đổi xuất hiện ở GET menu; một sản phẩm đã có đơn chỉ được ẩn/khóa bán, lịch sử đơn không bị đổi; CUSTOMER/STAFF gọi API quản trị nhận 403. TC-18. |

### 3.2. Giỏ hàng

| ID | Mức | Yêu cầu hệ thống | Acceptance Criteria |
|---|---|---|---|
| FR-05 | Must | Thêm một cấu hình đồ uống (SKU+toppings) vào giỏ. | **AC-05:** Cart chứa product/size/topping/quantity/giá dự kiến; thêm cấu hình giống nhau được gộp số lượng; khác cấu hình là dòng khác; không vượt 20/dòng. TC-05. |
| FR-06 | Must | Xem, tăng/giảm số lượng hoặc xóa dòng giỏ; giữ giỏ khi khách cần login. | **AC-06:** số lượng 0/xóa phải xóa dòng, giỏ không chứa số lượng âm; sau login khách vẫn thấy giỏ trước checkout; giỏ rỗng không thể `POST /orders`. TC-03/05. |
| FR-07 | Must | Hiển thị tổng tạm tính và số tiền cuối cùng sau reprice. | **AC-07:** `POST /checkout/quote` trả tổng dự kiến do server tính mà không giữ chỗ; giá bị sửa trong HTTP request không ảnh hưởng; khi giá catalog đổi trước tạo đơn, UI yêu cầu khách xác nhận lại giá mới; `POST /orders` tính lại lần cuối, số tiền chốt khớp Order. TC-05. |

### 3.3. Đăng ký, đăng nhập và phân quyền

| ID | Mức | Yêu cầu hệ thống | Acceptance Criteria |
|---|---|---|---|
| FR-08 | Must | Khách đăng ký bằng số điện thoại và OTP sandbox theo SP-03/04. | **AC-08:** số điện thoại được chuẩn hóa định dạng VN, không tạo tài khoản active khi OTP thiếu/sai/hết hạn/đã dùng; mỗi số active chỉ có 1 account; không hiển thị mã OTP thật trên production demo public. TC-01. |
| FR-09 | Must | Khách/nhân viên/chủ đăng nhập bằng điện thoại+mật khẩu và đăng xuất. | **AC-09:** đúng thông tin cấp access+refresh session; sai không cấp; logout thu hồi refresh/server session, client xóa cookie/token; token đã thu hồi không làm việc với endpoint bảo vệ. TC-02. |
| FR-10 | Must | NestJS kiểm tra JWT và RBAC/ownership cho API bảo vệ. | **AC-10:** thiếu/hết hạn/sai token trả 401; role thiếu quyền trả 403; khách A yêu cầu đơn khách B nhận 404 hoặc 403, không lộ dữ liệu; UI ẩn action không đủ quyền nhưng quyết định cuối tại API. SEC-01/02. |
| FR-11 | Must | Chặn tạo đơn khi khách chưa đăng nhập và khôi phục checkout sau xác thực. | **AC-11:** click Đặt hàng khi anonymous chuyển tới login/register, không tạo order; xác thực thành công quay lại review giỏ còn nguyên; không thể bypass qua API. TC-03. |
| FR-30 | Must | Sau khi OTP hợp lệ, người mới **thiết lập mật khẩu** trước khi dùng login bằng mật khẩu. | **AC-30:** đặt password dài tối thiểu 15 ký tự, cho phép tối thiểu 64 ký tự, kiểm tra danh sách mật khẩu yếu và không áp đặt kiểu pha trộn ký tự; không lưu plaintext; user không thể login mật khẩu trước bước này. TC-01. |
| FR-31 | Must | Làm mới phiên bằng refresh token luân phiên, revoke khi logout. | **AC-31:** refresh hợp lệ cấp access mới và vô hiệu refresh cũ; replay refresh cũ bị từ chối; hết 7 ngày không refresh được; access hết 15 phút bị từ chối. SEC-02. |
| FR-34 | Must | Giới hạn số lượt OTP/login không hợp lệ; phân biệt mock và nhà cung cấp OTP thật. | **AC-34:** OTP 6 chữ số dùng một lần, TTL5 phút, max 5 thử, cooldown 60 giây, max 3 mã/15 phút/số test; login giới hạn 10 lần sai/15 phút theo account+IP và trả thông báo chung, không cho phân biệt số điện thoại tồn tại. SEC-03. |

### 3.4. Đặt hàng, ưu đãi và thanh toán (liên hệ chặt với Task 1.3)

| ID | Mức | Yêu cầu hệ thống | Acceptance Criteria |
|---|---|---|---|
| FR-12 | Must | Chấp nhận **tối đa một mã giảm giá**, kiểm tra điều kiện trên backend. | **AC-12:** mã không tồn tại, bị tắt, hết hạn, không đủ min spend, hết quota, đã dùng vượt giới hạn trả lỗi rõ; khách nhập lại hoặc bỏ qua; coupon giảm không quá 50% subtotal; % từ 1–50; không tiêu lượt khi payment fail. TC-06. |
| FR-13 | Must | Cho phép sử dụng điểm thưởng đã có. | **AC-13:** điểm nguyên, không quá available balance hoặc 20% after-coupon (quy ra 100 VND/điểm); không âm; điểm chỉ consume 1 lần sau paid, payment fail/hủy không bị trừ. TC-07. |
| FR-14 | Must | Tính lại tổng phải trả ở backend theo SP-06…09. | **AC-14:** `payable = subtotal − couponDiscount − redeemPoints×100`; all values int VND; ví dụ 100.000 − 10.000 − 10.000 = 80.000; kết quả API order và số tiền gửi gateway bằng nhau; không cho client gửi tổng tùy ý. TC-05/06/07. |
| FR-15 | Must | Kiểm tra tồn kho và tính khả dụng trước tạo đơn. | **AC-15:** API so sánh quantity theo SKU với available, topping active; thiếu hàng trả 409 với danh sách SKU lỗi; không tạo paid/order payable; UI cho sửa giỏ. TC-08. |
| FR-16 | Must | Tạo Order `PENDING_PAYMENT` và giữ chỗ hàng/coupon/điểm **trong transaction**. | **AC-16:** order có `orderId`, `ownerId`, snapshot items/total, `expiresAt = createdAt + 10 min`; trường hợp đủ hàng tạo reservation atomic; một constraint bị lỗi rollback toàn bộ; cùng key `POST /orders` không tạo order trùng. TC-09/10. |
| FR-17 | Must | Tạo payment attempt cho ví hoặc thẻ **mô phỏng**, không thu tiền thật. | **AC-17:** chọn `MOCK_WALLET` hoặc `MOCK_CARD` kích hoạt mock service với orderId/amount/paymentRef; source type test, không nhập/lưu PAN/CVV; mock phản hồi SUCCESS/FAILED/UNKNOWN. TC-11. |
| FR-18 | Must | Xác nhận thành công từ mock, chuyển reservation thành tiêu dùng và trả mã đơn. | **AC-18:** chỉ khi backend xác minh paymentRef+orderId+amount và trạng thái `SUCCEEDED`, 1 transaction duy nhất chuyển Order sang PAID, consume coupon/points, cập nhật tồn kho; 2 callback giống nhau có cùng kết quả, không trừ hai lần. TC-10/11. |
| FR-19 | Must | Xử lý payment `FAILED` và cho retry hoặc cancel khi còn hiệu lực. | **AC-19:** UI hiện thất bại, chỉ tiếp tục attempt mới khi attempt trước FAILED, không tự tạo order mới; max 3 attempts trong TTL; khách hủy trước PAID → CANCELLED và release reservations 1 lần. TC-12. |
| FR-20 | Must | Ngăn duplicate effect ở yêu cầu tạo Order, thanh toán và webhook/callback. | **AC-20:** key cùng account+endpoint+payload → order/attempt logic giống nhau; cùng key khác payload trả 409; callback trùng bị no-op; key lưu ít nhất 24h. INT-08/09. |
| FR-32 | Must | Xử lý hết hạn, lỗi mạng và trạng thái thanh toán chưa rõ (`UNKNOWN`). | **AC-32:** sau 10 phút, chỉ cancel đơn chưa paid khi không có attempt UNKNOWN chưa reconcile; UNKNOWN có status inquiry, không tuyên bố FAILED/PAID; late success không âm thầm paid đơn CANCELLED; worker giải phóng đúng 1 lần. INT-10. |

### 3.5. Theo dõi, lịch sử, xử lý tại quầy và quản trị

| ID | Mức | Yêu cầu hệ thống | Acceptance Criteria |
|---|---|---|---|
| FR-21 | Must | Khách xem kết quả đặt hàng và trạng thái đơn mới nhất. | **AC-21:** sau PAID trả mã đơn; trang chi tiết có snapshot items, giá, trạng thái; người không sở hữu không đọc được. TC-13. |
| FR-22 | Must | Khách xem lịch sử đơn của mình. | **AC-22:** `GET /orders` lọc theo actor đăng nhập, mặc định sắp xếp mới nhất, hỗ trợ phân trang, không thấy đơn người khác. TC-13. |
| FR-23 | Must | Nhân viên nhận đơn trả tiền, cập nhật chuẩn bị/đã sẵn sàng/đã giao. | **AC-23:** STAFF xem `PAID` trở đi; chỉ cho `PAID→PREPARING→READY→COMPLETED`; chuyển nhảy hoặc lùi trả 409; history events lưu actor/time. TC-16. |
| FR-24 | Must | Thông báo **trong ứng dụng** khi payment và order status đổi. | **AC-24:** sau thanh toán UI hiện success/fail/UNKNOWN đúng; sau refresh trang trạng thái hiện dữ liệu mới; không bắt buộc SMS/email/push. TC-13/16. |
| FR-25 | Must | Owner quản lý mã giảm giá và quota. | **AC-25:** OWNER tạo/sửa/tắt coupon, điều kiện/valid range/limit; coupon disabled không được checkout; action khác role trả 403; quota reserved không vượt max. TC-18. |
| FR-26 | Must | Owner quản lý người dùng/role và trạng thái tài khoản. | **AC-26:** OWNER liệt kê, vô hiệu hóa user, gán role theo whitelist; CUSTOMER/STAFF không thể tự nâng quyền qua API; user bị vô hiệu không đăng nhập được. TC-18. |
| FR-33 | Must | Hệ thống tích điểm khi đơn đã giao/hoàn thành. | **AC-33:** `floor(payable/10_000)` điểm được cộng **một lần khi COMPLETED**; replay status không cộng lại; CANCELLED hoặc chưa PAID không tích điểm. TC-17. |

### 3.6. Backlog: Should / Could / Won’t (giới hạn phạm vi)

| ID | Mức | Yêu cầu / phạm vi | Tiêu chí xác nhận phạm vi |
|---|---|---|---|
| FR-27 | Won’t | Giao hàng, định vị người giao, phí ship. | Không có checkout giao tận nơi, route/actor shipper trong MVP. |
| FR-28 | Won’t | Thanh toán tiền thật/ví live, lưu số thẻ, refund thực tế. | Mock service only; không dùng live credentials/PAN/CVV. |
| FR-29 | Could | Báo cáo nâng cao và đề xuất đồ uống cá nhân hóa. | Không nằm trong DoD Task 5, tạo issue riêng nếu triển khai. |
| FR-35 | Should | Lọc menu theo danh mục hoặc tìm tên sản phẩm. | Có kết quả chính xác theo từ khóa/danh mục, empty state; không chặn luồng E2E nếu chưa có. |
| FR-36 | Could | Thông báo push hoặc đa chi nhánh. | Không nằm trong acceptance của bản này. |

## 4. Business Rules / Invariants

| BR | Quy tắc bắt buộc phải đúng xuyên suốt |
|---|---|
| BR-01 | Không có order khi giỏ rỗng, item/size/topping/số lượng không hợp lệ, hoặc tài khoản chưa auth. |
| BR-02 | Giá API authoritative; order lưu snapshot, thay catalog sau đó không đổi đơn cũ. |
| BR-03 | Số tồn khả dụng = `on_hand - reserved`, mọi giao dịch đổi tồn kho phải atomic; không bán vượt lượng có thể bán. |
| BR-04 | Reservation ở `PENDING_PAYMENT`, paid mới tiêu kho/điểm/coupon; canceled/expired mới release. |
| BR-05 | Tối đa 01 coupon và các điểm hợp lệ, thứ tự tính như SP-07…09; money integer VND. |
| BR-06 | Order status transitions chỉ theo SP-15; attempt status không đồng nghĩa order status. |
| BR-07 | Không thực hiện thử thanh toán mới khi attempt cuối `UNKNOWN` chưa reconcile; giao dịch trùng không có side-effect lặp. |
| BR-08 | Chỉ role STAFF/OWNER được cập nhật order operations; chỉ chủ sở hữu đọc order của chính họ. |
| BR-09 | Sau `PAID`, không có hủy/hoàn tiền trong MVP; nếu có nghiệp vụ mới phải tạo FR/UC mới. |
| BR-10 | Payment mock là giả lập, không nhận/lưu thông tin thẻ thật hay gọi cổng live. |
| BR-11 | Tích điểm đúng 1 lần khi order `COMPLETED`, bằng event/ledger có unique `orderId + earn_type`. |
| BR-12 | Mọi timestamp DB là UTC, mọi mức tiền là VND nguyên; đổi timezone chỉ ở UI. |

### 4.1. State model

| Đối tượng | Trạng thái | Chuyển hợp lệ |
|---|---|---|
| Order | `PENDING_PAYMENT` | `PAID`, `CANCELLED` |
| Order | `PAID` | `PREPARING` |
| Order | `PREPARING` | `READY` |
| Order | `READY` | `COMPLETED` |
| Order | `COMPLETED` / `CANCELLED` | Terminal, không được hồi sinh |
| Payment attempt | `INITIATED` | `SUCCEEDED`, `FAILED`, `UNKNOWN` |
| Payment attempt | `UNKNOWN` | Chỉ chuyển `SUCCEEDED`/`FAILED` khi hỏi lại nguồn mock; không tự kết luận |

### 4.2. Xử lý thất bại theo Task 1.3

| Case từ Task 1.3 | API / hành vi | Trạng thái cuối hợp lệ |
|---|---|---|
| E1/A1 — chưa đăng nhập | 401 khi gọi API; UI login/register và giữ giỏ | Chưa có order |
| E2/A2 — coupon không hợp lệ | 422/400 mã lỗi ứng với lý do; nhập lại/bỏ qua | Chưa có order (hoặc giỏ vẫn giữ) |
| E3/A3 — điểm sai | 422/400; nhập lại/bỏ qua | Chưa có order |
| E4/A4 — hết SKU | 409 + unavailable items; sửa giỏ | Không có order payable |
| E5/A5 — payment failed | attempt FAILED, retry mới hoặc cancel; không mất mã/điểm | `PENDING_PAYMENT` hoặc `CANCELLED` |
| Gateway timeout/response lost | attempt UNKNOWN → status inquiry, chặn retry gây duplicate charge | `PENDING_PAYMENT` cho tới khi reconcile |

## 5. External Interface Requirements (mức hợp đồng, không thay API specification)

### 5.1. UI

Mobile-first Next.js/PWA. Trang tối thiểu: menu, product detail, cart, login/register+verify OTP+set password, checkout, mock-payment result, my orders/order details, staff orders, owner products/promotions/users. UI cần hiển thị loading/empty/error, retry phù hợp, không che giấu lỗi hoặc tự ghi trạng thái thành công.

### 5.2. Backend API endpoints tham chiếu

| Nhóm | Endpoint tham chiếu | Quyền | Công dụng / ghi chú |
|---|---|---|---|
| Catalog | `GET /products`, `GET /products/:id` | Public | **Bắt buộc** Sprint 1 |
| Account | `POST /auth/register`, `POST /auth/verify-otp`, `POST /auth/set-password` | Public/OTP verified | SP-03; tránh tự kích hoạt trước xác minh |
| Session | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | Mixed | JWT+revoke |
| Cart | UI cart local/session; `POST /checkout/quote` (không side effect) | Customer | Không bắt buộc có `POST /cart`; giỏ có thể lưu client, server tính tổng lại tại quote và order |
| Order | `POST /orders` | Customer | JWT + Idempotency-Key, snapshot/reserve |
| Order | `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` | Customer/authorized | Owner check, cancel pending only |
| Payment | `POST /orders/:id/payments`, `GET /orders/:id/payment-status` | Owner customer | Idempotency-Key, gateway mock, UNKNOWN reconciliation |
| Staff | `GET /staff/orders`, `PATCH /staff/orders/:id/status` | Staff/Owner | Validate state machine |
| Owner | `/admin/products`, `/admin/promotions`, `/admin/users` | Owner | CRUD có RBAC |
| Health | `GET /health` | Public safe status only | Không lộ secret/connection detail |

**HTTP status policy:** 400 bad input; 401 unauthenticated; 403 forbidden; 404 not found/obscure private ID; 409 conflict (out of stock, invalid state, idempotency key reuse with other payload); 422 business-rule violation (coupon/points). 5xx error server không được được diễn giải thành payment failed nếu chưa truy vấn status.

**API schema chi tiết, tên trường thực tế, error code và mock contract** phải định nghĩa khi Task 3/4 triển khai theo đúng SRS; danh sách trên là hợp đồng tham chiếu và không phải bằng chứng API đã tồn tại.

## 6. Non-functional Requirements (quality requirements)

**Phương pháp:** ISO/IEC 25010:2023 cung cấp mô hình **nhóm chất lượng**, còn **số đo/điều kiện thử** ở đây do nhóm đề xuất để có acceptance reproducible. Chỉ tiêu phải được đo, không được coi là đã đạt khi chưa chạy test.

| ID | Chất lượng; mức | Yêu cầu có thể đo | Phương pháp/Pass criteria |
|---|---|---|---|
| NFR-01 | Performance / Must | `GET /products` nhanh ở tải demo. | **PERF-01:** trên staging warm (>=2 vCPU, 4 GB RAM cho web+API+DB, seed 100 products/1.000 orders), k6 20 VUs 5 phút, warm-up 2 phút: p95 API từ gateway vào API đến response **≤2.000 ms**, lỗi không dự kiến **≤1%**. |
| NFR-02 | Performance / Must | `POST /orders` và API cart/checkout không block bất thường. | **PERF-02:** cùng điều kiện, p95 **≤3.000 ms** cho Order creation không gồm thời gian chờ provider mock; report p50/p95/error rate; không tính lỗi 4xx do test cố ý. |
| NFR-03 | Security / Must | JWT & RBAC & ownership trên mọi route cần auth. | **SEC-01:** unauthorized 401, forbidden 403, cross-account access denied, không thể sửa user role từ client. |
| NFR-04 | Security / Must | Bảo vệ password, refresh, OTP và secret (định hướng NIST SP 800-63B-4 cho mật khẩu chỉ dùng một yếu tố). | **SEC-02/03:** Argon2id phù hợp cấu hình OWASP (hoặc phương án được ghi ADR và benchmark), không lưu plaintext; access 15m/refresh 7d+rotation/revoke, OTP controls; `git grep`/CI không thấy real secrets. |
| NFR-05 | Reliability/integrity / Must | Atomic order, inventory, coupon, loyalty and idempotency. | **INT-05…10:** 2 request đồng thời trên 1 SKU cuối chỉ 1 thành công; retry/callback duplicate không trừ kho/điểm trùng; rollback hoàn toàn khi failure. |
| NFR-06 | Usability / Must | Tất cả màn hình cốt lõi dùng mobile-first. | **UX-01:** kiểm thử viewport 360×800, 375×812, 768×1024, 1280×800; không tràn ngang do component của app; menu→checkout thực hiện được chỉ bằng chạm và bàn phím. |
| NFR-07 | Accessibility / Should | Mục tiêu WCAG 2.2 mức A/AA cho tuyến menu→checkout. | **UX-02:** label liên kết input, focus visible, text contrast ≥4.5:1 (text thường), không dùng màu đơn độc báo lỗi; axe tự động không báo critical, manual keyboard pass. Chỉ tuyên bố target, không tuyên bố toàn hệ thống đạt WCAG khi chưa audit. |
| NFR-08 | Portability/deployability / Must | Chạy local qua Docker Compose. | **DEP-01:** máy trống có Docker, `.env.example` đúng hướng dẫn; `docker compose up --build` chạy web, API, PostgreSQL; fresh migration + seed; E2E smoke pass. |
| NFR-09 | Deployability/security / Must | Có production demo HTTPS và DB private. | **DEP-02:** frontend/API qua HTTPS (valid certificate), `/health` 2xx, DB chỉ truy cập private network, secret qua environment/CI vault; ghi URL thực khi nộp. |
| NFR-10 | Testability / Must | Có tối thiểu unit/integration/E2E cho cốt lõi. | **QA-01:** unit pricing/coupon/points; integration order/payment; ≥1 E2E menu→paid→order status; tất cả pass trên CI trước merge. |
| NFR-11 | CI/CD / Must | Quality gates & deployment pipeline theo đề. | **QA-02:** PR chạy Install→Lint→Unit Test→Build và chặn merge khi thất bại; release pipeline build/tag image → push nếu cần → deploy → migrate an toàn → smoke → rollback procedure. |
| NFR-12 | Maintainability / Must | Version-control tạo phẩm và truy vết. | **QA-03:** repo chứa `apps/web`, `apps/api`, `docs`, tests, ADR, UML source+SVG/PNG, matrix, changelog, README, `.env.example`, logs pipeline. |
| NFR-13 | Recoverability / Must | Gateway timeout không dẫn đến xác nhận sai hoặc nhân đôi. | **INT-10:** UNKNOWN bảo toàn order và reservations trong lúc reconcile; không paid giả hoặc double charge; chứng minh bằng test có trạng thái mock xác định. |
| NFR-14 | Observability / Must | Có log và endpoint sức khỏe. | **OPS-01:** mỗi request lỗi ghi requestId, timestamp, route/status/duration; không log token/password/OTP/raw card info; health trả status mà không lộ secret; smoke sau deploy. |
| NFR-15 | Availability demo / Should | Frontend, API sẵn sàng tại giờ nghiệm thu. | **OPS-02:** trong cửa sổ demo 60 phút sau warm-up, synthetic probe 1 lần/30s; tổng thời gian probe thành công ≥99% (120 mẫu, tối đa 1 thất bại); report thực tế, không quảng cáo SLA thương mại. |
| NFR-16 | Auditability / Should | Ghi lại sự kiện thay đổi quan trọng. | **OPS-03:** log/audit event cho login fail, quản trị catalog/promo, đổi status, payment result; lưu actorId/action/resourceId/time và không chứa bí mật. |
| NFR-17 | Data quality / Must | Timestamps, status và amounts chuẩn hóa. | **DATA-01:** VND số nguyên, DB timestamp UTC, UI Việt Nam, FK/order item snapshot và constraints; test với thay đổi giá SKU. |
| NFR-18 | Responsive UX / Must | UI có trạng thái chờ, không có thao tác mơ hồ. | **UX-03:** sản phẩm loading/empty/error có chỉ dẫn; nút thanh toán bị vô hiệu trong lúc đang submit; sau submit timeout hiển thị 'Đang xác minh' chứ không báo thành công/thất bại khi chưa biết. |

### 6.1. Fixture và biên bản đo hiệu năng

Tạo `tests/performance/README.md` khi code thực tế để ghi **SHA commit, ngày, máy/CPU/RAM, Node/Postgres version, dataset seed, số VUs, thời lượng, phương pháp đo, percentiles và kết quả**. Nếu máy production demo nhỏ hơn baseline, đo lại trên cấu hình thật và ghi chênh lệch; không thay số âm thầm sau khi test fail.

## 7. Mô hình Use-case tổng quát — tài liệu kèm theo

Nguồn có thể chỉnh sửa ở `docs/diagrams/usecase-overview.puml`, hiển thị các actor: Customer, Staff, Owner, Mock Payment Service. Use-case nhóm đang có được giữ về mặt chủ thể; bổ sung `Xem thực đơn`, `Xem chi tiết sản phẩm`, `Theo dõi đơn`, `Thiết lập mật khẩu`, tách `Thanh toán mô phỏng` và `Quản lý khuyến mãi` cho đủ phạm vi.

**Lưu ý UML:** Use-case không phải nơi diễn tả mọi bước nội bộ (JWT, transaction, reserve)—chúng thuộc activity/sequence/business rules. Các `include` bắt buộc và `extend` tùy điều kiện phải dùng đúng chiều quan hệ; không mô hình hóa cập nhật status sau thanh toán thành một hành vi tùy chọn nếu nó bắt buộc xảy ra khi success.

## 8. Truy vết đến Task 1.3 và 2.1

| Luồng trong bảng UC 1.3 đã cung cấp | FR cần liên kết | Acceptance/Test |
|---|---|---|
| 1. Xem giỏ → Đặt | FR-05/06/07 | AC-05/06/07; TC-03/05 |
| 2. Kiểm tra login (E1/A1) | FR-08/09/10/11/30/31 | AC-08…11,30/31; TC-01/02/03 |
| 3–5. Nhập coupon/điểm (E2/E3) | FR-12/13 | AC-12/13; TC-06/07 |
| 6. Tính tổng | FR-14 | AC-14; TC-05 |
| 7. Kiểm tra tồn kho (E4/A4) | FR-15 | AC-15; TC-08 |
| 8. Tạo `PENDING_PAYMENT` | FR-16/20/32 | AC-16/20/32; TC-09/10 |
| 9. Gửi gateway mock | FR-17/19/20/32 | AC-17/19/20/32; TC-11/12 |
| 10. Success: paid, consume, mã đơn | FR-18/21/24 | AC-18/21/24; TC-10/13 |
| E5/A5: thất bại, thử lại, hủy | FR-19/20/32 | AC-19/20/32; TC-12 |
| Activity 2.1: nhân viên và khách theo dõi | FR-21/22/23/24/33 | AC-21…24/33; TC-13/16/17 |

**Cập nhật bắt buộc vào UC 1.3/Activity 2.1:** ghi thêm reservation vào bước 8; điều kiện paid/UNKNOWN/late payment; dòng 'hủy + giải phóng tồn kho' chỉ với order chưa PAID; chuyển trạng thái sau thanh toán, và chính sách điểm/coupon; chi tiết IMP-01…09 ở BL-REQ-03. Nếu chưa sửa hình/bảng cũ, **chưa thể tuyên bố toàn bộ Task 1.3 và 2.1 đã đồng bộ xong**.

## 9. Nghiệm thu Task 1.2

- [ ] FR có ID, loại MoSCoW, AC có input/output rõ; NFR có metric, tải, môi trường, cách đo và evidence.
- [ ] SRS đủ menu, detail, cart, auth, đặt, trả tiền, lịch sử, cập nhật trạng thái, bảo mật, performance, usability, deployment.
- [ ] Phạm vi In/Out không mâu thuẫn với Task 1.1; có use-case tổng quan ở `docs/diagrams/` cả nguồn và ảnh xuất.
- [ ] `SP-xx` và các thuật ngữ payment/status tồn kho được sử dụng thống nhất trong UC, activity, sequence/class và tests.
- [ ] Ma trận truy vết có test ID và ghi đúng trạng thái thực thi (chưa chạy test = Planned).
- [ ] Có review, PR và lịch sử thay đổi; không tự ghi 'approved' hoặc 'passed'.

## 10. Tài liệu tham khảo

1. Assignment2-BrewLite.pdf — §1–§9, tài liệu thầy giao, 2026.
2. Use-case Overview, Activity Diagram, UC Đặt và thanh toán do nhóm gửi trong cuộc trò chuyện.
3. ISO/IEC/IEEE 29148:2018: https://www.iso.org/standard/72089.html
4. ISO/IEC 25010:2023: https://www.iso.org/standard/78176.html
5. OWASP ASVS 5.0.0: https://asvs.owasp.org/
6. W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
7. RFC 9110: https://www.rfc-editor.org/rfc/rfc9110.html
8. OWASP Password Storage: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
9. NIST SP 800-63B-4 (password authenticator): https://pages.nist.gov/800-63-4/sp800-63b.html
10. OWASP Business Logic Security: https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html
