# BREWLITE — CONTEXT, STAKEHOLDERS & SCOPE

**Mã tài liệu:** BL-REQ-01  
**Assignment:** 2 — Task 1.1  
**Phiên bản:** 1.0.0 — *candidate baseline, sẵn sàng để nhóm duyệt*  
**Ngày lập:** 29/10/2026  
**Owner đề xuất:** Product Owner/Business Analyst của nhóm  
**Trạng thái phê duyệt:** **Chưa có minh chứng nhóm/giảng viên ký duyệt**; các quyết định SP-01…SP-16 là cấu hình thiết kế *được đề xuất và ghi rõ*, không phải quy định của chuẩn hay lời khẳng định đã được khách hàng phê duyệt.  
**Liên kết:** `srs.md` · `product-policy-and-approvals.md` · `../traceability-matrix.md` · use-case Task 1.3 và activity Task 2.1 do nhóm cung cấp.

## 1. Tóm tắt điều hành

BrewLite là **ứng dụng đặt đồ uống tại một cửa hàng, nhận tại quầy**. Khách hàng có thể xem thực đơn, chọn size/topping/số lượng, lập giỏ, đăng nhập, sử dụng mã khuyến mãi hoặc điểm thưởng, xác nhận đơn, thanh toán qua **cổng mô phỏng**, theo dõi và nhận đồ uống. Nhân viên xử lý đơn đã thanh toán. Chủ cửa hàng quản trị sản phẩm, người dùng và khuyến mãi.

**Luồng nghiệp vụ tối thiểu theo đề:** `Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn`. Cả Next.js (mobile-first/PWA), NestJS và PostgreSQL là thành phần bắt buộc. Hai sprint dẫn tới bản demo production có URL HTTPS, API/health check, kiểm thử và pipeline CI/CD.

## 2. Vấn đề nghiệp vụ và giá trị cần đạt

**Hiện trạng giả định dùng để xác định bài toán** (không phải kết luận khảo sát thực địa): đặt món thủ công tại quầy có thể gây chậm khi chọn đồ uống, nhầm size/topping, khó biết đơn đang chuẩn bị tới đâu, và khó thống nhất dữ liệu thực đơn/khuyến mãi. Nhóm chưa cung cấp số liệu hiện trạng; **không đưa ra tỷ lệ giảm thời gian, giảm sai sót hoặc tăng doanh thu như một sự thật đã đo lường**.

**Nhu cầu kinh doanh:** (BG-01) hiển thị đúng sản phẩm/giá; (BG-02) hỗ trợ hoàn thành checkout có xử lý lỗi; (BG-03) nhân viên xem và cập nhật đơn đúng quyền; (BG-04) tránh đơn/trừ tồn kho/điểm bị lặp; (BG-05) có bản ứng dụng chạy thực tế và bằng chứng kiểm thử.

**Định nghĩa thành công cho Assignment 2:** chạy được tối thiểu 01 E2E từ menu tới xác nhận thanh toán và theo dõi đơn; mô phỏng được các nhánh hết hàng, chưa đăng nhập, giảm giá/điểm sai, thanh toán thất bại; có code/test/tài liệu/sơ đồ/CI/CD/URL production đối chiếu theo ma trận truy vết. Các chỉ tiêu hiệu năng cụ thể được định nghĩa trong NFR của SRS, không suy diễn từ đề.

## 3. Stakeholders và trách nhiệm

| ID | Stakeholder | Phân loại | Lợi ích / nhu cầu | Trách nhiệm / thẩm quyền cần ghi nhận |
|---|---|---|---|---|
| ST-01 | Khách hàng | Người dùng cuối, actor chính | Tìm món, giá chính xác, thanh toán rõ kết quả, theo dõi đơn và bảo vệ dữ liệu | Xác nhận tính dễ dùng của kịch bản checkout qua review/demo |
| ST-02 | Nhân viên quầy/pha chế | Người vận hành, actor | Chỉ tiếp nhận đơn đã thanh toán, xem chi tiết món, chuyển trạng thái nhanh | Xác nhận workflow `PAID → PREPARING → READY → COMPLETED` |
| ST-03 | Chủ cửa hàng/Quản lý | Chủ sản phẩm/actor | Kiểm soát menu, trạng thái bán, khuyến mãi, tài khoản và quyền truy cập | Là người **cần phê duyệt** quy tắc ưu đãi, tồn kho, hủy đơn (nếu có người đóng vai này) |
| ST-04 | Giảng viên/bên nghiệm thu | Stakeholder nghiệm thu | Đề bài được đáp ứng, sơ đồ và code truy vết được, demo hoạt động | Chấm theo yêu cầu Assignment 2, không mặc định phê duyệt chính sách của nhóm |
| ST-05 | Nhóm phát triển (BA/FE/BE/QA/DevOps) | Nhà cung cấp và vận hành | Yêu cầu không mơ hồ, ranh giới công việc, test và ADR rõ | Đề xuất chính sách, review, bảo trì baseline, chuẩn bị evidence |
| ST-06 | Cổng thanh toán mô phỏng | Hệ thống bên ngoài; actor phụ trong UML | Hợp đồng API xác định, kết quả giao dịch đối chiếu được, không bị xử lý lặp | Cung cấp giao diện kết quả/test fixture; không có tiền thật |

**Phân biệt:** stakeholder không nhất thiết là actor UML. Ở use-case tổng quát, actor nghiệp vụ là Khách hàng, Nhân viên, Chủ cửa hàng và Cổng thanh toán mô phỏng.

## 4. Các vai trò và quyền nghiệp vụ

| Nghiệp vụ | Khách vãng lai | Khách đăng nhập | Nhân viên | Chủ cửa hàng |
|---|:---:|:---:|:---:|:---:|
| Xem menu/chi tiết sản phẩm | Có | Có | Có | Có |
| Cập nhật giỏ | Có | Có | — | — |
| Đặt và thanh toán; xem đơn của chính mình | Không | Có | — | — |
| Xem danh sách đơn trả tiền, cập nhật tiến độ | — | — | Có | Có¹ |
| Quản lý sản phẩm/menu | — | — | — | Có |
| Quản lý khuyến mãi, tài khoản, phân quyền | — | — | — | Có |

¹ Quyền chủ cửa hàng xem/cập nhật đơn là quyền giám sát theo vai trò quản lý trong bản triển khai đề xuất. Mọi API phải thực thi RBAC phía server; không suy quyền từ UI.

## 5. Ranh giới sản phẩm

### 5.1 In scope — MVP bàn giao cuối Sprint 2

**Khách hàng:** Xem menu/chi tiết; chọn size, topping, số lượng; giỏ hàng; đăng ký bằng số điện thoại/OTP mô phỏng có kiểm soát; thiết lập mật khẩu; đăng nhập bằng số điện thoại/mật khẩu; JWT/đăng xuất; áp dụng mã giảm giá và điểm; giá/tổng tiền tính trên server; kiểm tra và giữ chỗ tồn kho; tạo đơn chờ thanh toán; thanh toán ví/thẻ mô phỏng; xử lý thất bại/thử lại/hủy/hết hạn; xem mã đơn, trạng thái, lịch sử.

**Nhân viên:** Đăng nhập, xem danh sách đơn đã trả tiền, chi tiết tùy chọn đồ uống, chuyển trạng thái chuẩn bị/sẵn sàng/đã giao; thông tin đơn trả về UI cho khách.

**Chủ cửa hàng:** Đăng nhập, CRUD/ẩn sản phẩm và tùy chọn có quản lý khả dụng/tồn kho SKU, quản lý khuyến mãi, xem và phân quyền người dùng. Phần quản trị này đã xuất hiện trong Use-case tổng quát nhóm gửi, do đó đưa vào phạm vi thay vì bỏ sót.

**Kỹ thuật:** Next.js mobile-first/PWA; NestJS API mô-đun; PostgreSQL + migration/seed; mock-payment service; Docker Compose local; unit/integration/E2E; Git/PR/CI/CD; production HTTPS, registry nếu cần, log/health check; README/release notes/rollback; tài liệu UML và ma trận truy vết.

### 5.2 Delivery theo Sprint (không nhầm với mức ưu tiên MoSCoW)

| Giai đoạn | Phạm vi bắt buộc có bằng chứng |
|---|---|
| Task 1–3 | `context-and-scope.md`, SRS, use-case, activity, sequence, class, ADR, deployment diagram |
| Sprint 1 / Task 4 | Repository, docs, issue board, CI; **GET /products**, **GET /products/:id**, UI menu mobile-first có loading/empty/error, seed và test đầu tiên |
| Sprint 2 / Task 5 | Đầy đủ các chức năng checkout và vận hành; test, Docker Compose, pipeline build/deploy, URL production và demo |

### 5.3 Future / Could — không được xem là điều kiện nghiệm thu hiện tại

Báo cáo phân tích doanh thu nâng cao, push notification, nhiều cửa hàng, gợi ý AI, định mức nguyên vật liệu chi tiết, tích hợp thiết bị bán hàng và hóa đơn điện tử. Mọi thay đổi phải tạo change request, đánh giá ảnh hưởng FR/diagram/test/sprint trước khi nhận.

### 5.4 Out of scope / Won’t trong Assignment 2

Thanh toán tiền thật; kết nối live ngân hàng/ví; lưu chi tiết thẻ thanh toán; giao hàng/định vị shipper; quản trị nhiều chi nhánh; kế toán/ERP; quản lý công thức định mức nguyên liệu; SLA 24/7 thương mại; SMS OTP thật (trừ khi nhóm chủ động mua và cấu hình nhà cung cấp). Bản deploy được gọi **production demo** về hạ tầng, không được quảng bá là dịch vụ thương mại đã qua đánh giá bảo mật.

## 6. Giả định có kiểm soát

| ID | Giả định | Ảnh hưởng nếu sai | Cách xác nhận |
|---|---|---|---|
| AS-01 | Một cửa hàng, đơn nhận tại quầy | Phải bổ sung vận chuyển/địa điểm | Review owner / kịch bản |
| AS-02 | Khách vãng lai có thể tạo giỏ; checkout phải đăng nhập | Thay đổi UC E1/A1 và JWT | Demo checkout |
| AS-03 | Cổng thanh toán chỉ mô phỏng, hỗ trợ success/fail/status | Phải đổi workflow payment | Contract test mock |
| AS-04 | Mỗi biến thể sản phẩm (`product + size`) là một SKU tồn kho; topping có flag khả dụng | Cần mô hình kho nguyên liệu | Review dữ liệu seed |
| AS-05 | Giá và tồn kho do server quản lý; mọi đơn lưu snapshot giá và tùy chọn | Khó truy vết thay đổi giá | Integration test |
| AS-06 | Có thể áp dụng tối đa 1 mã và điểm thưởng trong cùng đơn | Thay đổi tính giá, loyalty | Xem ví dụ tiền tại policy |
| AS-07 | Không có hủy/hoàn tiền sau `PAID` trong MVP | Cần refund use-case | Review luồng đơn |
| AS-08 | Production demo có dữ liệu test, tài khoản seed theo quyền, không dùng thông tin nhạy cảm thật | Thay thế OTP/mock/live services | Review deployment |

## 7. Ràng buộc (phân biệt với giả định)

| ID | Ràng buộc | Cơ sở |
|---|---|---|
| CO-01 | Next.js mobile-first/PWA, NestJS, PostgreSQL là 3 thành phần công nghệ bắt buộc | Assignment 2 §1.1 |
| CO-02 | Luồng menu → tùy chọn → giỏ → đặt → thanh toán → theo dõi | Assignment 2 §1.1 |
| CO-03 | Task 1–5 theo thứ tự, bằng chứng version control và traceability | Assignment 2 §1, §8 |
| CO-04 | Activity phải có nhánh hết hàng, chưa login, thanh toán thất bại; sequence phải có JWT, transaction, idempotency | Assignment 2 §4 |
| CO-05 | CI PR Install→Lint→Unit Test→Build; có ít nhất 1 test E2E | Assignment 2 §6–7 |
| CO-06 | Production có HTTPS, API/health endpoint, DB không public trực tiếp, secret không lộ, rollback | Assignment 2 §7 |
| CO-07 | Chỉ dùng thanh toán mô phỏng; người sử dụng không giao dịch tiền thật | Assignment 2 §5.1 và use-case nhóm |
| CO-08 | Các chính sách SP-xx phải có trace và test; thay đổi phải qua issue/PR | Quy tắc kiểm soát thay đổi nội bộ phiên bản này |

## 8. Risks, mitigations, verification

| ID | Risk | Khả năng / ảnh hưởng (ước lượng) | Kiểm soát chủ động và bằng chứng |
|---|---|---|---|
| RK-01 | Oversell khi checkout đồng thời | Trung bình / Cao | Atomic reserve + row lock/conditional update; test concurrent checkout |
| RK-02 | Payment retry/callback trùng | Cao / Cao | Unique payment reference, key + payload fingerprint, event dedupe; INT-08/09 |
| RK-03 | Thanh toán đã thành công nhưng client timeout | Trung bình / Cao | Status inquiry; không mặc định thất bại; INT-10 |
| RK-04 | Point/coupon concurrent use | Trung bình / Cao | Reserve trong transaction, release khi hủy/TTL; INT-06/07 |
| RK-05 | OTP mock bị hiểu nhầm là xác minh SMS thật | Trung bình / Cao | Demo-only test phone allowlist; cảnh báo rõ; không công bố sản phẩm bảo mật production thực |
| RK-06 | JWT/role/IDOR sai | Trung bình / Cao | RBAC owner checks, automated 401/403/404; SEC-01…04 |
| RK-07 | Deploy thất bại cuối kỳ | Trung bình / Cao | Deploy staging sớm, health+smoke, release tag, rollback drill |
| RK-08 | Tài liệu, UC và activity lệch trạng thái | Cao / Trung bình | Ma trận FR ↔ UC ↔ diagram ↔ test, change checklist |

## 9. Phụ thuộc và acceptance boundary

**Bên ngoài:** giả lập thanh toán, dịch vụ OTP thử nghiệm, hạ tầng deploy; công nghệ này không cam kết SLA thương mại. **Bên trong:** đã có Task 1.3 và Activity 2.1 bản nháp, còn cần đồng bộ theo impact list tại `product-policy-and-approvals.md`.

**Điều kiện sẵn sàng nghiệm thu Task 1.1:** (1) có stakeholder và mục tiêu; (2) in/out/future scope rõ; (3) assumption khác constraint; (4) risk có control; (5) có định danh chính sách và version; (6) lưu repo. **Điều kiện gọi là “đã phê duyệt”**: người có thẩm quyền nhóm/đại diện chủ cửa hàng đã ghi quyết định trong PR/issue hoặc biên bản. Tài liệu hiện chưa có bằng chứng đó.

## 10. Nguồn, thứ tự ưu tiên khi có xung đột

1. **Assignment2-BrewLite.pdf** — yêu cầu môn học bắt buộc (2026).
2. **Use-case “Đặt và thanh toán đơn hàng” và 03 hình UML do nhóm gửi** — hành vi nghiệp vụ đã thiết kế; có vài điểm cần cập nhật để nhất quán.
3. **BL-REQ-02 / SP-xx** — quyết định cụ thể hóa để lập trình; *đề xuất để nhóm review*, không phải dữ kiện thu thập từ cửa hàng.
4. ISO/IEC/IEEE 29148:2018 (hướng dẫn kỹ nghệ yêu cầu), ISO/IEC 25010:2023 (mô hình chất lượng), OWASP ASVS 5.0, WCAG 2.2 — tài liệu tham chiếu, **không tự động thay thế** phạm vi đề bài.

Thông tin nguồn và URL tại `product-policy-and-approvals.md`.
