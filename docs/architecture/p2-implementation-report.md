# P2 — Database schema expand & inventory

Ngày kiểm chứng: 07/11/2026 (Asia/Saigon). P2 đã áp dụng local; chưa commit/push/PR. Không tuyên bố hoàn thành Checkout/Payment E2E hoặc CI trên GitHub.

## 1. Git và điểm xuất phát

- Branch `feature/menu-api-compat`, HEAD `d703bf2`.
- Working tree đã có nhiều thay đổi P0/P1 và các prototype Cart/Order/Payment/Frontend trước lượt P2. Giữ nguyên, không reset/clean/stash hoặc tự phân loại toàn bộ là thay đổi P2.
- Không sửa AGENTS.md, .env, .env.local, secrets, role User hoặc dữ liệu nghiệp vụ vận hành. Không stage/commit/push/merge.
- Audit thực tế: 3 migrations đã áp dụng trước P2 (khác báo cáo cũ nói 2); cả 3 checksum khớp source. Đã có 21 model/bảng ứng dụng, bao gồm 5 bảng foundation; không tạo trùng bảng.

## 2. Backup và điều kiện áp dụng

- Docker `brewlite-postgres` healthy; PostgreSQL 16, `brewlite_db/public`, localhost:5433.
- Backup custom cuối trước migration: `C:\Users\NGOC GIAU\AppData\Local\BrewLite\backups\brewlite-p2-before-20261107-052537.dump` (398884 byte).
- Tạo bằng pg_dump, copy ra ngoài container/Git, đọc được toàn bộ TOC bằng pg_restore --list; hash bản copy bền vững khớp bản đã kiểm tra. Chưa diễn tập restore toàn bộ; không tuyên bố đã khôi phục thử.
- Snapshot đầu thấy AuthSession tăng 2→3 trong khi kiểm thử. Lượt apply đó bị chặn trước khi ghi; đối chiếu xác nhận chỉ bảng phiên thay đổi. Đã tạo backup/snapshot mới, không ghi đè phiên mới.
- Audit trước migration: 0 Size thiếu Product, 0 orphan, 0 tên trùng theo chuẩn hóa, 0 cấu hình lệch Product/Size, 0 tồn sai, 0 Order có nhiều SUCCESS. Không có schema drift ở điểm xuất phát.

## 3. Migration và models

Migration mới: `apps/api/prisma/migrations/20261107140000_p2_inventory_hardening/migration.sql`.

Đã áp dụng vào `public` sau khi cùng migration qua kiểm thử PostgreSQL cách ly. Tổng 4 migrations đều Applied/checksum khớp; Prisma migrate diff báo No difference detected. Vẫn 21 bảng ứng dụng, không tính _prisma_migrations.

| Model | Thay đổi trong P2 |
| --- | --- |
| Size | Product bắt buộc sau kiểm tra 0 orphan; unique(id,productId); Product FK RESTRICT; CHECK tồn NULL chặt hơn; unique tên theo Product bằng lower+trim |
| CartItem | Composite FK (sizeId,productId)→Size(id,productId); index sizeId. Giữ sizeId/configurationKey nullable |
| OrderItem | Composite FK SKU/Product và index sizeId; không đổi snapshots |
| CartItemTopping | Bổ sung index toppingId; composite PK/FKs đã có được giữ |
| OrderReservation | createdAt/updatedAt nullable cho expand; CHECK pointsReserved>=0; không backfill thời gian giả |
| OrderStatusHistory | Index actorId; CHECK orderVersion>=0; createdAt hiện có là thời điểm changedAt, không thêm cột trùng |
| IdempotencyRecord | processingStatus IN_PROGRESS/SUCCEEDED/FAILED; index expiresAt. result JSON đã là kết quả tham chiếu, không tạo bản sao resourceId |
| Payment | resolvedAt nullable; CHECK attemptNumber null hoặc 1..3; unique partial chỉ cho SUCCESS/Order, vẫn cho nhiều attempts khác |
| PaymentEvent | processedAt, processingStatus RECEIVED/PROCESSED/REQUIRES_REVIEW, metadata nullable; index(paymentId,receivedAt) |
| Cart | CHECK version>=0; CartItem quantity 1..20 |

Có 7 cột bổ sung, 2 enum, 9 index (6 thường + 3 unique), 6 CHECK mới và 3 FK được thay bằng ràng buộc mạnh hơn. Việc thay FK chỉ là metadata trong một transaction; không DROP TABLE hoặc xóa dữ liệu. Product.stockQuantity và enum MANAGER được giữ.

Quy tắc tên Size được người yêu cầu xác nhận: bỏ whitespace hai đầu, không phân biệt hoa/thường trong cùng Product. Index expression dùng cùng tập whitespace của JS trim; không thay tên hiển thị hoặc tự normalize nội dung legacy. Không bỏ dấu, không gộp tên giữa hai Product.

Các cấu trúc tương đương được tái dùng: pointsReserved = điểm được giữ; Order.promotionId liên kết khuyến mãi cho reservation qua Order bất biến; providerPaymentId/transactionRef đã là provider reference. Không tạo ProductSKU, bảng kho hay cột alias trùng chức năng.

## 4. Bảo toàn dữ liệu

Đối chiếu SHA-256 canonical JSON của toàn bộ cột cũ và số dòng của từng bảng, ngay trước/sau migration: `originalRowsUnchanged=true`, `changedTables=[]`.

| Dữ liệu public | Trước | Sau |
| --- | ---: | ---: |
| User | 4 | 4 |
| Product / Size / Topping | 7 / 16 / 5 | 7 / 16 / 5 |
| Cart / CartItem | 1 / 2 | 1 / 2 |
| Order / OrderItem / OrderItemTopping | 3 / 4 / 3 | 3 / 4 / 3 |
| Payment | 3 | 3 |
| Promotion / LoyaltyTransaction / Notification | 3 / 2 / 4 | 3 / 2 / 4 |
| Reservation / StatusHistory / PaymentEvent | 0 / 0 / 0 | 0 / 0 / 0 |

Hai CartItem legacy vẫn sizeId/key NULL, giữ note/quantity và requiresConfiguration. 16 Size vẫn onHand NULL, reserved=0. Không phân bổ tồn từ Product, tạo reservation/history/điểm hồi tố hoặc sửa role. Hai IdempotencyRecord có final result đã commit nhận default processingStatus SUCCEEDED; đây là metadata receipt, không xác nhận email/payment thành công giả.

Snapshot chỉ lưu counts, tên cột, hash và metadata schema ngoài repository; không ghi row cá nhân hoặc secrets ra báo cáo. Files tại thư mục Temp: `brewlite-p2-before-20261107-052537.json`, `brewlite-p2-after-20261107-052537.json`.

## 5. Backend và Cart compatibility

- InventoryModule/InventoryService: getAvailableStock, validateSizeBelongsToProduct, validateSellableConfiguration.
- NULL là chưa nhập tồn, khác zero; reject stock invariant sai, Product/Size ngừng bán, topping thiếu/ngừng bán hoặc SKU khác Product.
- reserve/consume/release là primitive nội bộ nhận transaction và dùng conditional UPDATE atomic. Không có API cho khách sửa reserved; caller P3/P5 phải sở hữu reservation lifecycle/idempotency. P2 không tự tạo Order để thử kho vận hành.
- Endpoint hiện có `PATCH /api/admin/sizes/:id/inventory` được tái dùng: ADMIN guard, DTO số nguyên không âm, expectedVersion CAS, onHand>=reserved và audit trong cùng transaction. Trường reserved tùy ý bị từ chối. Không mất update khi hai ADMIN gửi cùng version.
- Các route Cart đang hoạt động trong CommerceModule dùng DTO UUID/size/topping/quantity/note, canonical SHA-256 key, validation inventory chung; không tin giá client. Giữ notes bên trong, chỉ trim hai đầu và CRLF→LF. Khác Size/Topping/nội dung/case note là dòng riêng.
- Product/catalog API và JSON money string giữ tương thích; size có inventoryStatus UNINITIALIZED và availableQuantity=null khi chưa nhập tồn.
- CartService cũ trong src/cart chưa được AppModule đăng ký; không bật lại hoặc ghi đè module cũ trong P2. P3 cần thống nhất module sở hữu Cart để tránh quay lại validation legacy.
- Không xóa sessionStorage hoặc sửa source Frontend trong lượt P2. Các Order/Payment prototype đã có được giữ; chỉ cập nhật metadata hỗ trợ mới, không triển khai thêm flow E2E.

## 6. Kiểm chứng

| Bước | Kết quả |
| --- | --- |
| Prisma validate / generate | Passed |
| Migration status / checksum / drift | 4 Applied; checksum khớp; không khác datamodel |
| Catalog pg_constraint/pg_indexes | Đã kiểm tra FK composite, CHECK và hai unique expression/partial |
| Backend lint / unit / build | Passed / 53 Passed / Passed |
| P2 PostgreSQL integration | 9 Passed trên database riêng brewlite_p2_test_1794029678374 |
| Frontend lint / unit / build | Passed / 74 Passed / Passed |
| HTTP local | health, products, detail, toppings và /menu đều 200; 7 products; basePrice JSON string |
| Browser smoke | 1440px và 390px: 7 cards, không tràn ngang, 0 runtime exceptions ở Menu |

P2 integration kiểm tra thật: inventory NULL/zero/checks, normalized Size uniqueness/required parent, ADMIN 200 và CUSTOMER/STAFF 403, reserved/client decimal bị từ chối, composite FK, topping không hợp lệ, cấu hình giỏ khác nhau/legacy giữ nguyên, CAS hai ADMIN, cạnh tranh SKU cuối, consume/release và một SUCCESS/Order. Không override Prisma/API bằng mock.

Runner đầu tiên đã dùng schema test riêng; runner cuối đã đổi sang database riêng đúng ràng buộc. Các schema test cũ được giữ nguyên, không drop/xóa. Runner mới kiểm tra cả current_database và current_schema trước ghi fixture. Chỉ database test có fixture/tồn dùng cho test; public không được tạo dữ liệu mẫu.

Lệnh: `npm.cmd run test:p2` tại apps/api. Cần quyền CREATE DATABASE local hoặc cung cấp P2_TEST_DATABASE_URL trỏ DB mới tên brewlite_p2_test_*. Không có fallback/reset. Runner integration hiện có gọi bổ sung P2 để không bỏ quên các tests này; chưa push nên không có bằng chứng GitHub CI mới.

## 7. Files trong lượt P2

Tạo: src/inventory/{inventory.module,inventory.service,inventory.dto,inventory.service.spec,cart-configuration}.ts; src/commerce/cart.dto.ts; test/p2-inventory.e2e-spec.ts; scripts/audit-p2.cjs; scripts/run-p2-tests.cjs; migration mới; báo cáo này.

Sửa: prisma/schema.prisma; src/commerce/{commerce.module,commerce.controller,commerce.service,admin.service}.ts; package.json (test:p2); scripts/run-integration-tests.cjs; bổ sung link trạng thái trong database-baseline.md. Các đường dẫn code tương đối với apps/api.

Không sửa migration cũ, SRS/UML, .env/secrets, Frontend hoặc các file local được bảo vệ. Những thay đổi cũ trong git status vẫn thuộc working tree trước P2.

## 8. Điều kiện chuyển P3

Nền schema/inventory P2 đã sẵn sàng. Trước cho phép đặt món vận hành: ADMIN nhập tồn thực tế từng Size, không suy từ Product. SKU NULL/zero vẫn bị từ chối đúng chính sách.

P3 cần thống nhất Cart module/DTO, rà soát merge/retry/optimistic version và sửa legacy qua lựa chọn khách hàng; bảo toàn giỏ khách khi merge lỗi. Nghiệp vụ reservation theo Order, expiry, consume/release idempotent và thanh toán tiếp tục thuộc các phase sau, không lấy các prototype cũ làm bằng chứng nghiệm thu P2.

Rollback: giữ backup ngoài Git; ưu tiên forward-fix. Không reset/drop/rollback xóa cột hoặc ghi đè database hiện tại. Bản ứng dụng rollback phải tương thích các constraint mạnh hơn. Chưa chạy restore hoặc deploy/CI remote trong P2.