# BrewLite P0 — Implementation baseline

Version 1.1 · 2026-11-07. Các quyết định chức năng đã được người yêu cầu thống nhất; chưa có PR/review hoặc chữ ký phê duyệt tập thể. Đây là baseline mục tiêu, không phải tuyên bố đã implement. CR-SEC-01 về mật khẩu Unicode vẫn chờ phê duyệt thay đổi yêu cầu.

## Bộ tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| [ADR-0001](adr/0001-p0-baseline.md) | Quyết định, thay đổi so với thiết kế cũ, approval gates |
| [Database](database-baseline.md) | 16 bảng giữ lại, 5 bảng bổ sung, Size là SKU, ERD và constraints |
| [API](api-contract.md) | Contract CUSTOMER/STAFF/ADMIN, trạng thái hiện hữu/mục tiêu, money và errors |
| [RBAC](rbac-matrix.md) | Quyền từng actor và bootstrap ADMIN |
| [Auth/session](auth-session-spec.md) | Email/bcrypt/OTP, refresh rotation, cookies, CSRF, CR-SEC-01 |
| [Order/payment](order-payment-state-machine.md) | Trạng thái, transaction, reservation, idempotency và UNKNOWN |
| [Migration](migration-plan.md) | Expand/backfill/switch/contract và rollback |
| [PR roadmap](implementation-plan.md) | P1–P9: files, DB, API, UI, tests, dependencies |
| [UML checklist](uml-update-checklist.md) | Nguồn thực có và phần cần nhóm cập nhật |
| [Auth hiện tại](authentication.md) | Hướng dẫn và giới hạn code trước P1; không thay thế specification mục tiêu |
| [RTM](../traceability-matrix.md) | Requirement → Schema → API → UI → Test và trạng thái bằng chứng |

## Điểm xuất phát được audit

Branch `feature/menu-api-compat`, HEAD `d703bf2`; Auth mới và nhiều file liên quan còn local chưa commit. PostgreSQL `brewlite_db/public`, 16 bảng nghiệp vụ + bảng migration, hai migration `20261103161938_init` và `20261107083000_email_cookie_auth` đã áp dụng ở lần kiểm tra trước. Không reset hoặc chạy lại seed để đạt baseline này.

Đã quan sát code/test Auth access cookie, OTP Gmail transport và quote; chưa có refresh, giỏ DB cấu hình đủ, inventory Size, API tạo Order/Payment hoặc STAFF workflow. `/admin` hiện chỉ liệt kê User. Số Order/Payment seed không chứng minh luồng E2E.

Kết quả kiểm thử từ lượt triển khai trước: FE 60 tests; BE 17 unit + 9 Auth HTTP + 3 health/pricing HTTP; lint/build đã được báo Passed. Không chạy lại hoặc nâng thành bằng chứng nghiệm thu P0/P1 trong lần sửa tài liệu này. Gmail thật còn cần cấu hình/kiểm chứng; không đọc hay ghi secrets để hoàn thiện tài liệu.

## Quy tắc bàn giao

- Không có ProductSKU; `Size.id` là SKU. 21 bảng là thiết kế mục tiêu, hiện chưa có 5 bảng mới.
- Quyết định người yêu cầu không được ghi thành stakeholder/giảng viên đã ký duyệt.
- Không có Assignment PDF/Activity/Sequence nguồn trong repository đã kiểm tra. Không tuyên bố sửa UML gốc khi chỉ có PNG.
- Source, Prisma, migrations và database không thay đổi trong P0. Các lệnh migration ở tài liệu là kế hoạch cho PR sau, không phải lệnh cần chạy ở P0.
- Trước implementation: kiểm tra working tree, tách thay đổi đang có thành phạm vi review được; không reset, tự stash, ghi đè hoặc đưa secrets/AGENTS/history vào PR.