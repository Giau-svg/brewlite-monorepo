# Order, pricing và payment state machine

Target P4–P7; không phải bằng chứng source đã có module đặt hàng. Size.id là SKU, không có ProductSKU. [API](api-contract.md), [DB](database-baseline.md).

## Giá chuẩn

Tất cả dùng Decimal với số đồng nguyên; không tính tiền bằng floating-point Number. API serialize chuỗi số nguyên.

```
subtotal = SUM((basePrice + sizeExtra + SUM(toppingPrice)) * quantity)
couponRaw = fixedAmount OR floor(subtotal * percent / 100)
couponDiscount = min(couponRaw, configuredMaxDiscount nếu có, floor(subtotal * 0.50))
afterCoupon = subtotal - couponDiscount
maxPoints = min(balancePoints - reservedPoints, floor(floor(afterCoupon * 0.20) / 100))
redeemValue = pointsUsed * 100
payable = afterCoupon - redeemValue
earnedPoints = floor(payable / 10000), chỉ khi COMPLETED
```

Một coupon; percent 1..50 theo policy. Từ chối pointsUsed vượt balance/cap thay vì âm thầm đổi số điểm. Coupon kiểm tra active, thời gian, min spend, quota dùng+giữ và giới hạn khách. Discount không làm tăng tổng hoặc tạo order payable=0 khi subtotal>0. Mọi validation lại ở tạo Order; quote không reserve.

## Order transitions

| From | To | Actor/điều kiện | Side effect transaction |
| --- | --- | --- | --- |
| Không có | PENDING_PAYMENT | CUSTOMER, cart/giá/stock/quota/điểm hợp lệ | snapshot + giữ tài nguyên + expiresAt=createdAt+10m + history |
| PENDING_PAYMENT | PAID | Backend xác minh SUCCESS mock đúng amount/order/payment | consume reservation một lần; tồn/điểm/coupon cập nhật cùng transaction |
| PENDING_PAYMENT | CANCELLED | CUSTOMER hoặc SYSTEM; không paid, không unresolved UNKNOWN; xử lý race với attempt đang chạy | release HELD một lần, ghi history |
| PAID | PREPARING | STAFF, expectedVersion hợp lệ | tăng version + history actor/time |
| PREPARING | READY | STAFF | tăng version + history, notification |
| READY | COMPLETED | STAFF | history + EARN ledger/điểm đúng một lần |
| COMPLETED/CANCELLED | Không chuyển | Terminal | không hồi sinh |

ADMIN chỉ giám sát; CUSTOMER không set PAID/COMPLETED. Nhảy/lùi trạng thái trả 409. PAID không có cancel/refund trong MVP.

## Payment attempts

Giữ enum hiện hữu PENDING/SUCCESS/FAILED, thêm UNKNOWN. SRS INITIATED ánh xạ PENDING, SUCCEEDED ánh xạ SUCCESS. Một Order có 0..n attempts nhưng tối đa 3 được tạo trong TTL.

```
PENDING -> SUCCESS | FAILED | UNKNOWN
UNKNOWN -> SUCCESS | FAILED (chỉ sau status inquiry/event đã xác minh)
FAILED -> attempt mới với key mới, không sửa attempt cũ thành PENDING
```

Retry mạng cùng attempt giữ key cũ; retry nghiệp vụ sau FAILED tạo key mới. Không tạo attempt mới khi còn PENDING đang xử lý hoặc UNKNOWN. Trước gửi gateway phải commit attempt/reservation; không giữ DB transaction khi chờ mạng. Worker đối soát PENDING quá hạn mạng thành UNKNOWN, không kết luận FAILED chỉ vì timeout.

## Reservation và transaction boundaries

OrderReservation state HELD→CONSUMED hoặc HELD→RELEASED, hai trạng thái cuối không chuyển lại. Quantity theo từng Size lấy từ OrderItem snapshot, gộp cùng Size trước reserve. Khi onHand NULL luôn từ chối tạo order; không diễn giải là 0/vô hạn.

- Tạo order: idempotency + transaction validate cartVersion, User availablePoints, Promotion quota, các Size active/available; khóa/cập nhật có điều kiện; tạo snapshot/HELD/expiry/history. Lỗi bất kỳ rollback hết, không còn order mồ côi.
- SUCCESS: khóa Order/Payment/reservation; verify provider IDs, amount và trạng thái; HELD→CONSUMED conditional; Size.onHand -= qty, Size.reserved -= qty; User.loyaltyPoints -= points, reservedPoints -= points; Promotion.usedCount +=1, reservedCount -=1; REDEEM ledger và PAID/history/event trong cùng commit.
- FAILED: không consume; giữ HELD đến cancel/expiry để retry đúng giới hạn.
- Cancel/expiry: chỉ HELD→RELEASED thắng mới giảm reserved counters; không trừ onHand/balance/usedCount. Worker chạy lại no-op.
- COMPLETE: chỉ chuyển READY→COMPLETED thắng mới tạo EARN ledger, tăng điểm; unique(orderId,type) là hàng rào bổ sung.

Dùng serializable transaction hoặc row lock + conditional update có kiểm chứng. Quy định thứ tự khóa thống nhất giữa các service, khóa Size theo ID đã sort, retry serialization/deadlock có giới hạn; không chỉ if-check rồi update rời rạc.

## Idempotency, history và callback

Idempotency unique(actorId,operation,key), hash canonical payload gồm các trường có nghĩa. Same key+same payload trả cùng resource/kết quả; khác payload 409. Tạo record và resource/side effect trong transaction tương ứng. Giữ record tối thiểu 24 giờ; IN_PROGRESS phải có recovery, không tạo duplicate khi timeout. Không cache raw JWT/password/OTP.

PaymentEvent providerEventId unique; duplicate event no-op. Nguồn callback là mock adapter nội bộ hoặc endpoint có chữ ký/secret riêng; không public nút SUCCESS. Mock scenario được cấu hình bằng test fixture, không cho customer gửi outcome tùy ý. Kiểm tra eventId/paymentId/orderId/amount, callback out-of-order không ghi đè SUCCESS thành FAILED.

History lưu from/to/actor/time/orderVersion; SYSTEM có actorType SYSTEM, không tạo User giả. Notification eventKey và ledger unique bảo vệ chạy lại.

## Hết hạn và UNKNOWN

Sau 10 phút không tạo attempt mới. Chỉ cancel/release khi đã xác nhận không có payment success hay attempt chưa rõ. UNKNOWN/PENDING chưa giải quyết phải inquiry trước; không giải phóng mù quáng. Reconciliation retry có giới hạn và cảnh báo vận hành; chưa biết thì vẫn giữ trạng thái rõ ràng cho khách. Late SUCCESS sau CANCELLED ghi PaymentEvent cần xử lý, không tự chuyển Order PAID hay trừ kho hồi tố.

## Tests bắt buộc

Hai khách tranh 1 Size cuối; nhiều line cùng Size; cùng coupon quota cuối; hai request dùng cùng điểm; idempotency cùng/khác payload; price/cart changed; worker release chạy lại; callback trùng/đảo thứ tự; tối đa 3 attempts; FAILED retry; UNKNOWN chặn retry/cancel; late SUCCESS; STAFF nhảy trạng thái/ADMIN update bị chặn; COMPLETED lặp không EARN hai lần. Seed records không thay thế các tests này.