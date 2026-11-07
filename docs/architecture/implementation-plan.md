# PR implementation roadmap — P1 tới P9

P0 chỉ docs; các paths bên dưới là dự kiến, không khẳng định đã có file. Mỗi PR phải ghi schema/API breaking changes, test log và commit/CI evidence. Không commit/push hoặc tách nhánh trong P0.

## Dependency và quyền sở hữu migration

```
P0 -> P1 Auth
P0 -> P2 Schema Expand
P1 + P2 -> P3 Cart/Inventory -> P4 Pricing -> P5 Order -> P6 Mock Payment -> P7 Tracking/STAFF
P1 + P2 + contract liên quan -> P8 ADMIN (có thể chia PR con)
Các luồng tích hợp -> P9 Release
```

P1 và P2 có thể ở hai nhánh riêng. P1 sở hữu AuthSession/Auth fields; P2 sở hữu cart/inventory/order foundations. Một người review Prisma; không sửa migration applied, không tạo migration trùng fields giữa nhánh. Rebase/giải quyết schema diff bằng review trước merge; không reset DB để xử lý conflict.

| PR | Files/modules dự kiến | DB và API | Frontend | Tests/acceptance | Phụ thuộc/rủi ro |
| --- | --- | --- | --- | --- | --- |
| P1 Auth | api/src/auth/*, main.ts, prisma/schema.prisma + migration AuthSession mới, scripts/bootstrap-admin.ts; web/services/auth.service.ts, lib/auth-store.ts, components/auth/login-form.tsx | OTP5m; refresh endpoint, rotation family/hash, logout kể cả access expired; CUSTOMER/STAFF/ADMIN; bootstrap CLI có kiểm soát | Email/OTP/login/logout, Axios refresh single-flight, role navigation và giữ giỏ | Gmail inbox thật có phép; OTP/rate/reuse, concurrent refresh, cookie/CSRF, role/ownership; unit+HTTP+browser; CR-SEC-01 có review | P0; cần SMTP/JWT config riêng, tài khoản ADMIN được xác nhận; không tự verified/nâng MANAGER |
| P2 Schema Expand | api/prisma/schema.prisma, migration SQL mới, schema/invariant tests | Thêm 5 bảng; nullable fields, indexes/constraints theo migration plan; Size inventory | Chưa đổi UI nghiệp vụ, chuẩn bị types khi tương thích | Apply trên DB clone + kiểm tra row counts/FK/legacy NULL; restore backup test | P0; phối hợp P1 fields, lock/constraint và migration order |
| P3 Cart & Inventory | api/src/cart/*, products/*, DTO; web/cart provider/config/service, menu/detail/types | CartItem size/toppings/key/version, merge/PATCH; onHand allocation đã duyệt, availability theo Size | Guest local, merge sau login, sửa/xóa không mất cấu hình, SKU chưa initialized không đặt | Merge retry/failed/cap, same product khác options/note; spoof owner; Size không thuộc Product; NULL/zero stock và aggregate cùng Size | P1/P2; nguy cơ mất local/nhân tồn/đọc hai nguồn stock |
| P4 Pricing | api/src/pricing/* (tách logic có thẩm quyền), CartService calculate adapter; web/quote.service.ts, PriceQuote types/PurchaseFlow | Giữ /cart/calculate, money string; Decimal/caps/coupon/points; không reserve | Hiển thị quote sau Auth, lỗi cụ thể, xác nhận giá mới | 100000-10000-10000=80000; cap/rounding/balance; invalid size/topping không bị bỏ; quote không ghi tài nguyên; fake client price | P3; breaking number→string cần release FE/BE cùng lúc |
| P5 Order | api/src/orders/*, reservation/inventory services, idempotency; web/order service và confirm flow | POST/GET/cancel orders; transaction snapshots/HELD/expiry, version và keys | Xác nhận mua tạo pending, hết hàng cập nhật thông tin cho khách sửa, không tự xóa giỏ | Tranh 1 SKU/coupon/points cuối; cùng SKU nhiều dòng; rollback toàn bộ; repeated keys, PRICE_CHANGED/CART_CHANGED | P3/P4; oversell, partial writes, lịch sử seed không có reservation |
| P6 Mock Payment | api/src/payments/*, mock-provider adapter, reconciliation worker, PaymentEvent | Attempts <=3; SUCCESS/FAILED/UNKNOWN, signed/internal events, consume/release một lần | Ví/thẻ mock, kết quả rõ, retry/cancel đúng trạng thái | Duplicate/out-of-order callback, network timeout, inquiry, expiry race, late success, không PAN/CVV/tiền thật | P5; không giữ transaction lúc gọi provider; không public outcome override |
| P7 Tracking & STAFF | api/orders queries, staff/*, status/history, loyalty/notification services; web/orders/*, staff/orders/* | Own history; STAFF transition sequential, optimistic version; EARN/notify đúng một lần | Lịch sử khách; STAFF PAID/PREPARING/READY và options/note | IDOR, ADMIN/CUSTOMER không pha chế, version conflict, COMPLETED lặp, notification dedupe, refresh dữ liệu thật | P5/P6; snapshot/tồn/điểm phải cùng nguồn dữ liệu |
| P8 ADMIN | api/admin catalog/promotions/users/orders; web/app/admin/* | CRUD/disable, inventory onHand>=reserved, promotion used+held cap, User whitelist và last-admin check | Catalog/Size/Topping, promotion, account, đơn chỉ đọc | RBAC trực tiếp, bootstrap/mapping review, ẩn món lịch sử không đổi, không làm mất reservation hoặc ADMIN cuối | P1/P2 và service contracts; có thể làm song song UI nhưng mock không là evidence hoàn thành |
| P9 Release | tests/ E2E runner, docker/CI/deploy configs, web PWA config, README/deployment/release docs | Test data riêng, health/HTTPS, secret management, rollback; không reset demo đang dùng | Browser mobile/desktop, PWA, error/retry/auth expiry | Luồng khách→paid→STAFF→completed→points, mọi nhánh lỗi; CI install/lint/test/build, integration/E2E và CD evidence | Các PR tích hợp; TLS hiện có bypass cần sửa nguyên nhân certificate và bỏ NODE_TLS_REJECT_UNAUTHORIZED=0 ở PR hạ tầng |

## PR đầu tiên có thể triển khai

P1 Auth có thể bắt đầu sau review P0 và CR-SEC-01; chưa cần chờ phân bổ tồn Size. Công việc độc lập: sửa TTL OTP, rate limits, schema refresh, refresh/logout/cookie/guards và test. Kiểm chứng Gmail thật cần chủ cấu hình secrets ở .env; bootstrap chỉ khi đã có tài khoản email được duyệt. P2 chạy song song với ownership migration như trên; không cần tự lựa chọn size/topping hoặc tồn để tạo schema expand.

## Definition of Done

- Từng PR có code, migrations mới nếu cần, contracts/types và test cùng version; không bỏ qua lint/test/build.
- Phân biệt code present, unit pass, HTTP integration pass, Gmail/browser/E2E thực đã kiểm chứng; gắn log/SHA/CI link thật.
- Không dùng row seed, screenshot mock hoặc số tests cũ để xác nhận chức năng mới.
- Review tác động requirements, rollback và dữ liệu local; không commit .env/AGENTS/history/cache.
- Test cases cũ còn phone/OWNER phải cập nhật theo RTM trong PR implementation, không âm thầm bỏ test nhằm xanh CI.