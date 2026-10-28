# BrewLite — Requirements Traceability Matrix (RTM)

**Version:** 1.0.0 candidate · **Status:** DESIGN/PLANNED — **không có bằng chứng code/test thực thi**.

Đường truy vết: `Nguồn → FR/NFR → UC/Activity → API/module → Test design → Evidence sau này`. Các mã `UC01…UC19` khớp với alias trong sơ đồ PlantUML kèm theo; chúng là tham chiếu cho nhóm đồng bộ, **không khẳng định các bản UML cũ đã được cập nhật**.

## Functional requirements

| Requirement | Mức | Nguồn | Use-case/Activity | Component/API dự kiến | Test cases | Implementation/evidence |
|---|---|---|---|---|---|---|
| FR-01 | Must | [A]+[U]+[D] | UC01 (Menu) | `GET /products` | TC-04 | Planned; PR/SHA: — |
| FR-02 | Must | [A]+[U]+[D] | UC02 (Menu) | `GET /products/:id` | TC-04 | Planned; PR/SHA: — |
| FR-03 | Must | [A]+[U]+[D] | UC03 (Menu) | `Catalog/Cart` | TC-05 | Planned; PR/SHA: — |
| FR-04 | Must | [U]+[D] | UC17 (Owner) | `/admin/products` | TC-18 | Planned; PR/SHA: — |
| FR-05 | Must | [A]+[U]+[D] | UC04 (Cart) | `UI cart` | TC-05 | Planned; PR/SHA: — |
| FR-06 | Must | [A]+[U]+[D] | UC04 (Cart) | `UI cart` | TC-03/05 | Planned; PR/SHA: — |
| FR-07 | Must | [A]+[U]+[D] | UC08 (Cart) | `POST /checkout/quote` | TC-05 | Planned; PR/SHA: — |
| FR-08 | Must | [A]+[U]+[D] | UC05 (Auth) | `/auth/register` | TC-01 | Planned; PR/SHA: — |
| FR-09 | Must | [A]+[U]+[D] | UC06/UC07 (Auth) | `/auth/login/logout` | TC-02 | Planned; PR/SHA: — |
| FR-10 | Must | [A]+[U]+[D] | UC08 (Auth) | `JWT/RBAC` | SEC-01/02 | Planned; PR/SHA: — |
| FR-11 | Must | [U]+[D] | UC08 (Auth) | `POST /orders` | TC-03 | Planned; PR/SHA: — |
| FR-30 | Must | [U]+[D] | UC05 (Auth) | `/auth/set-password` | TC-01 | Planned; PR/SHA: — |
| FR-31 | Must | [U]+[D] | UC06 (Auth) | `/auth/refresh` | SEC-02 | Planned; PR/SHA: — |
| FR-34 | Must | [U]+[D] | UC05 (Auth) | `OTP and auth throttles` | SEC-03 | Planned; PR/SHA: — |
| FR-12 | Must | [U]+[D] | UC12 (Checkout) | `Coupon validator` | TC-06/INT-07 | Planned; PR/SHA: — |
| FR-13 | Must | [U]+[D] | UC13 (Checkout) | `Loyalty service` | TC-07/INT-06 | Planned; PR/SHA: — |
| FR-14 | Must | [U]+[D] | UC08 (Checkout) | `Pricing service` | TC-05/06/07 | Planned; PR/SHA: — |
| FR-15 | Must | [A]+[U]+[D] | UC09 (Checkout) | `Inventory service` | TC-08/INT-05 | Planned; PR/SHA: — |
| FR-16 | Must | [A]+[U]+[D] | UC10 (Checkout) | `POST /orders` | TC-09/INT-05 | Planned; PR/SHA: — |
| FR-17 | Must | [A]+[U]+[D] | UC11 (Payment) | `POST /orders/:id/payments` | TC-11 | Planned; PR/SHA: — |
| FR-18 | Must | [A]+[U]+[D] | UC11 (Payment) | `Mock webhook/DB` | TC-10/INT-09 | Planned; PR/SHA: — |
| FR-19 | Must | [A]+[U]+[D] | UC11 (Payment) | `Cancel/retry API` | TC-12 | Planned; PR/SHA: — |
| FR-20 | Must | [A]+[U]+[D] | UC11 (Payment) | `Idempotency store` | INT-08/09 | Planned; PR/SHA: — |
| FR-32 | Must | [U]+[D] | UC11 (Payment) | `Worker+reconciliation` | TC-12/INT-10 | Planned; PR/SHA: — |
| FR-21 | Must | [A]+[U]+[D] | UC15 (Orders) | `GET /orders/:id` | TC-13 | Planned; PR/SHA: — |
| FR-22 | Must | [A]+[U]+[D] | UC14 (Orders) | `GET /orders` | TC-13 | Planned; PR/SHA: — |
| FR-23 | Must | [A]+[U]+[D] | UC16 (Staff) | `PATCH /staff/orders/:id/status` | TC-16 | Planned; PR/SHA: — |
| FR-24 | Must | [A]+[U]+[D] | UC15 (Orders) | `UI notification` | TC-13/16 | Planned; PR/SHA: — |
| FR-25 | Must | [U]+[D] | UC18 (Owner) | `/admin/promotions` | TC-18/INT-07 | Planned; PR/SHA: — |
| FR-26 | Must | [U]+[D] | UC19 (Owner) | `/admin/users` | TC-18 | Planned; PR/SHA: — |
| FR-33 | Must | [U]+[D] | UC16 (Orders) | `Loyalty ledger` | TC-17 | Planned; PR/SHA: — |
| FR-27 | Won’t | [D] exclusion | Out of scope (Excluded) | `—` | — | Planned; PR/SHA: — |
| FR-28 | Won’t | [D] exclusion | Out of scope (Excluded) | `—` | — | Planned; PR/SHA: — |
| FR-29 | Could | [D] backlog | Future backlog (Backlog) | `—` | — | Planned; PR/SHA: — |
| FR-35 | Should | [D] backlog | UC01 (Backlog) | `Catalog filtering` | Planned if included | Planned; PR/SHA: — |
| FR-36 | Could | [D] backlog | Out of scope now (Backlog) | `—` | — | Planned; PR/SHA: — |

## Non-functional requirements

| Requirement | Quality/test domain | Test case | Evidence |
|---|---|---|---|
| NFR-01 | Performance / Must | PERF-01 | Planned; CI/report: — |
| NFR-02 | Performance / Must | PERF-02 | Planned; CI/report: — |
| NFR-03 | Security / Must | SEC-01 | Planned; CI/report: — |
| NFR-04 | Security / Must | SEC-02/03 | Planned; CI/report: — |
| NFR-05 | Reliability/integrity / Must | INT-05…10 | Planned; CI/report: — |
| NFR-06 | Usability / Must | UX-01 | Planned; CI/report: — |
| NFR-07 | Accessibility / Should | UX-02 | Planned; CI/report: — |
| NFR-08 | Portability/deployability / Must | DEP-01 | Planned; CI/report: — |
| NFR-09 | Deployability/security / Must | DEP-02 | Planned; CI/report: — |
| NFR-10 | Testability / Must | QA-01 | Planned; CI/report: — |
| NFR-11 | CI/CD / Must | QA-02 | Planned; CI/report: — |
| NFR-12 | Maintainability / Must | QA-03 | Planned; CI/report: — |
| NFR-13 | Recoverability / Must | INT-10 | Planned; CI/report: — |
| NFR-14 | Observability / Must | OPS-01 | Planned; CI/report: — |
| NFR-15 | Availability demo / Should | OPS-02 | Planned; CI/report: — |
| NFR-16 | Auditability / Should | OPS-03 | Planned; CI/report: — |
| NFR-17 | Data quality / Must | DATA-01 | Planned; CI/report: — |
| NFR-18 | Responsive UX / Must | UX-03 | Planned; CI/report: — |

## Review gate và cách ghi bằng chứng

1. Khi thực hiện: điền GitHub issue/PR, file controller/service thực tế, test filename, commit SHA, CI URL và kết quả (Pass/Fail/Blocked) cho từng dòng.
2. Khi thay SP-xx: impact review đến use-case, activity, sequence, class và test. Không được xóa FR ID cũ để che dấu thay đổi; deprecate và ghi changelog.
3. `Planned` **không có nghĩa** test đã chạy; hình mẫu UML **không có nghĩa** ảnh Visual Paradigm người dùng cung cấp đã sửa.
4. Với `Should/Could/Won’t`, nếu bỏ qua thì ghi rõ quyết định release; không đánh dấu test thất bại nếu ngoài phạm vi được chấp thuận.

## Ma trận ngoại lệ UC Task 1.3

| Case | Yêu cầu | Test | Expected |
|---|---|---|---|
| E1/A1 chưa login | FR-08/09/10/11/30 | TC-01/03 | Auth rồi tiếp tục giỏ |
| E2/A2 coupon sai | FR-12/14 | TC-06 | Nhập lại/bỏ, không mất quota |
| E3/A3 điểm sai | FR-13/14 | TC-07 | Nhập lại/bỏ, không trừ điểm |
| E4/A4 hết hàng | FR-15/16 | TC-08/INT-05 | 409, không tạo payable order |
| E5/A5 payment failed | FR-17/19/20/32 | TC-11/12/INT-10 | Retry hoặc cancel/release an toàn |
| Timeout/UNKNOWN bổ sung | FR-20/32 | INT-10 | Reconcile, không kết luận sai/nhân đôi |
