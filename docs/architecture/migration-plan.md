# Migration plan — expand/backfill/switch/contract

Kế hoạch cho P1–P6, không được chạy trong P0. Không reset/drop/truncate, sửa migration đã áp dụng hoặc chạy seed có deleteMany. Giữ dữ liệu User/Order/Payment và giỏ local. [DB target](database-baseline.md).

## Điều kiện trước migration

- Ghi nhận branch/SHA, git status; bảo vệ mọi thay đổi local, không tự stash/clean/reset.
- Review SQL và restore thử backup trên môi trường riêng. Ghi nơi lưu/retention/người chịu trách nhiệm; backup không commit vào repo.
- Đối chiếu migrations applied và schema thật bằng truy vấn read-only. Không suy rằng migration Auth mới chưa có chỉ vì file còn untracked.
- Chốt mapping ADMIN theo ID/email đã được chủ tài khoản xác nhận, người phân bổ stock và CR-SEC-01. Không tự nâng role hoặc xác minh account.
- Kiểm tra giá thập phân, size orphan/trùng tên, email canonical collision, cart thiếu cấu hình và dữ liệu pending seed. Xuất báo cáo không lộ thông tin cá nhân/secret.

## P1 — Auth session mở rộng

Thêm fields nullable refresh family/hash/parent/usedAt vào AuthSession qua migration mới. Không đổi expiresAt của session cũ để cấp thêm quyền; chỉ login mới cấp refresh family. Giữ MANAGER trong enum đến khi mapping được duyệt, chặn role đó ở API target không thuộc quyền. TTL OTP là cấu hình/service change, không cần viết lại lịch sử migration. Rollback ứng dụng phải vẫn đọc được fields bổ sung.

## P2 — Expand

1. Thêm 5 bảng mục tiêu nếu vẫn chưa có tương đương. Dùng migration mới với timestamp/SQL review, không sửa hai migration đã applied.
2. Size thêm onHand nullable, reserved=0, isAvailable; NULL là chưa phân bổ. Product.stockQuantity vẫn là legacy cho đến switch có kiểm soát.
3. CartItem thêm nullable sizeId/key và requiresConfiguration; Cart.version. New writes bắt buộc đúng contract, legacy vẫn đọc được để khách sửa.
4. OrderItem sizeId/snapshot bổ sung nullable; Order expiry/version/coupon/policy fields; Payment UNKNOWN và attempt fields; ledger/notification references nullable legacy.
5. Tạo index/unique sau khi scan trùng; constraints tương thích dữ liệu cũ. Đánh giá lock table và maintenance window trước khi siết constraint.

## P3 — Backfill và switch Cart/Inventory

- ADMIN hoặc nhóm duyệt bảng phân bổ onHand theo Size. Tổng onHand từng Product đối chiếu stockQuantity gốc, không tự nhân bản/chia đều; chênh lệch phải có quyết định.
- Chỉ SKU đã phân bổ và hợp lệ mới được bán sau switch. NULL không phải hết hàng và không phải vô hạn; UI hiển thị chưa sẵn sàng.
- Chưa biết size/topping của CartItem cũ: requiresConfiguration=true; không đoán từ tên Product hoặc chọn size rẻ nhất. Cho khách sửa/xóa; không tự làm mất dòng.
- configurationKey tạo từ cấu hình xác định. Legacy chưa biết giữ NULL; unique nullable không phải cách bỏ qua validation cho new writes.
- Merge local sau auth transaction/idempotent; giữ bản local khi API thất bại. Nếu quantity sau gộp vượt 20/options sai thì conflict, không trim ngầm.
- Switch nguồn tồn sang Size cùng backend/catalog/UI release. Tắt writers stockQuantity legacy, không dual-write tự do hoặc cho hai service tính hai số tồn khác nhau.

## P4–P6 — Giá và giao dịch

- Giữ cột Decimal hiện có; scan fractional/negative. Số lẻ chưa được tự làm tròn mất dữ liệu: báo cáo và xin quyết định. Enforce VND nguyên ở service và CHECK sau khi dữ liệu sạch.
- Đổi quote money number→string cùng FE parser/types/tests; endpoint giữ nguyên. Không bỏ field/client đang dùng trước rollout.
- Không reserve/trừ tài nguyên hồi tố cho 3 đơn seed hoặc sửa Payment SUCCESS cũ thành pending. New Order có HELD reservation; worker chỉ xử lý những row reservation có thật.
- Backfill history chỉ ghi sự kiện IMPORTED/ảnh chụp hiện trạng nếu có thiết kế event phù hợp, không bịa actor/thời điểm transition đã không được lưu. Không tạo lịch sử PAID→COMPLETED giả từ current status.
- Ledger legacy không biết orderId để NULL; new ledger yêu cầu reference + unique. Không đoán liên kết từ description.
- Payment attempts cũ có thể đánh số theo createdAt/id sau đối chiếu, nhưng không bịa fingerprint/key tương đương request lịch sử. Key cũ/NULL được giữ có đánh dấu legacy; new request phải có key.

## Contract và rollback

Chỉ loại MANAGER/stockQuantity hoặc siết CartItem.sizeId NOT NULL khi dữ liệu và mọi caller đã chuyển xong. Không xóa cột ngay sau expand.

| Thời điểm | Rollback |
| --- | --- |
| Chưa switch, chưa giao dịch mới | Rollback app tương thích; giữ additions, không drop để làm gọn |
| Đã switch nhưng chỉ kiểm thử riêng | Dừng writes, đối chiếu, dùng backup riêng có kế hoạch và sự cho phép |
| Đã có Order/Payment mới | Ưu tiên forward-fix; không restore mù quáng mất giao dịch; reconcile với PaymentEvent/reservations trước phục hồi |

Tiêu chí go/no-go: backup phục hồi được, không có orphan bất ngờ, tổng tồn/điểm/quota cân bằng, new request không dùng legacy path, tests concurrency/idempotency pass, có người quyết định rollback. Migration dữ liệu MANAGER không được gộp thành thao tác tự động trên mọi row role MANAGER.