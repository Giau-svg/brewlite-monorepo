# BrewLite API contract — target P1–P9

Version 1.1 · 2026-11-07. Bảng route phân biệt hiện hữu với cần bổ sung. Không tạo endpoint trùng chức năng quote. Prefix mọi route `/api`.

## Quy ước

- ID UUID string, validate đúng định dạng. Timestamps ISO-8601 UTC. Money regex `^(0|[1-9][0-9]*)$`, đơn vị VND nguyên; quantity/points/version là JSON integer. Decimal arithmetic ở Backend; Frontend chỉ preview.
- Không nhận userId/role/unitPrice/finalTotal của client làm thẩm quyền. Actor từ cookie JWT + User/Session DB. Ownership dùng 404 để không lộ tài nguyên người khác.
- Error: `{code,message,details?,requestId?}`. 400 DTO/options sai; 401 auth; 403 role/CSRF/unverified; 404 private/not found; 409 stock/version/state/idempotency conflict; 422 coupon/points; 429 throttle; 503 dependency unavailable. Không coi 5xx là payment FAILED.
- List target `{items,nextCursor}`; cursor/pageSize bounded 1..100. Giữ raw catalog array hiện tại ở giai đoạn chuyển đổi nếu FE đang dùng; đổi envelope phải cùng PR adapter/test, không đổi ngầm.
- API money hiện chưa đồng nhất: catalog Decimal string, quote number. P4 chuyển quote sang chuỗi và cập nhật types/parser/UI/tests đồng thời; không dùng Number để cộng tiền Backend.

## Route và hợp đồng

| Method/path | Hiện trạng | Quyền target | Request → response |
| --- | --- | --- | --- |
| GET /health | Có | Public | status/service/time an toàn |
| POST /auth/register | Có | Public | fullName,email,password → 201 message, không OTP/token/role |
| POST /auth/verify-email | Có | Public | email,code → 200 message |
| POST /auth/resend-otp | Có | Public | email → 200 thông báo chung; 429 giới hạn |
| POST /auth/login | Có, cần refresh | Public | email,password → user an toàn + hai Set-Cookie |
| POST /auth/refresh | Chưa | Refresh cookie + CSRF | Không body token → user + rotated cookies; 401 invalid/reused |
| GET /auth/me | Có | Access hợp lệ | user id/fullName/email/role/emailVerifiedAt/loyaltyPoints; không passwordHash |
| POST /auth/logout | Có, cần family | Cookie + CSRF | revoke family + clear hai cookies, 200 message |
| GET /products | Có | Public | array Product, category, sizes; ẩn không xuất hiện; hết hàng có thể hiện availability |
| GET /products/:id | Có | Public | Product + sizes + availableToppings; hidden/missing 404 |
| GET /toppings | Có | Public | topping active, giá chuỗi |
| GET /categories | Chưa | Public | danh mục thật, không tạo category giả |
| GET /cart | Có, thiếu cấu hình | CUSTOMER | cart id/version/items/subtotal |
| POST /cart/items | Có, thiếu options | CUSTOMER | productId,sizeId,toppingIds,quantity,note,expectedVersion → cart chuẩn mới |
| PATCH /cart/items/:id | Chưa | CUSTOMER sở hữu | cấu hình/quantity/expectedVersion → cart mới |
| DELETE /cart/items/:id | Có | CUSTOMER sở hữu | expectedVersion qua If-Match → cart mới |
| DELETE /cart/:cartId | Có | CUSTOMER sở hữu | If-Match → giỏ rỗng/version mới |
| POST /cart/merge | Chưa | CUSTOMER | items local + expectedVersion + Idempotency-Key → cart chuẩn; conflict details nếu không merge toàn bộ được |
| POST /cart/calculate | Có, sai một số policy | CUSTOMER | items,couponCode?,pointsUsed? → quote, không tạo/reserve |
| POST /orders | Chưa | CUSTOMER | cartVersion,couponCode?,pointsUsed?,quoteFingerprint + Idempotency-Key → 201 order snapshot/PENDING_PAYMENT/expiresAt |
| GET /orders | Chưa | CUSTOMER | cursor/pageSize → đơn của mình mới nhất |
| GET /orders/:id | Chưa | CUSTOMER sở hữu | snapshot/history/payment summary, không dữ liệu khách khác |
| POST /orders/:id/cancel | Chưa | CUSTOMER sở hữu | expectedVersion + Idempotency-Key → CANCELLED nếu pending và không UNKNOWN |
| POST /orders/:id/payments | Chưa | CUSTOMER sở hữu | method WALLET/CARD + Idempotency-Key → payment id/status/attemptNumber |
| GET /payments/:id | Chưa | CUSTOMER sở hữu | status/amount/orderId/retryAllowed; UNKNOWN không khẳng định thất bại |
| GET /staff/orders | Chưa | STAFF hoặc ADMIN chỉ đọc | PAID/PREPARING/READY, snapshot món, cursor |
| PATCH /staff/orders/:id/status | Chưa | Chỉ STAFF | nextStatus,expectedVersion + Idempotency-Key → order/version/history mới |
| GET /admin/orders | Chưa | ADMIN | giám sát mọi trạng thái, không mutation pha chế |
| GET/POST /admin/products; PATCH /admin/products/:id | Chưa | ADMIN | phân trang/tạo/sửa/ẩn catalog; lịch sử giá không đổi |
| GET/POST /admin/categories; PATCH /admin/categories/:id | Chưa | ADMIN | quản lý danh mục |
| GET/POST /admin/products/:id/sizes; PATCH /admin/sizes/:id | Chưa | ADMIN | biến thể và extraPrice chuỗi; Size là SKU |
| PATCH /admin/sizes/:id/inventory | Chưa | ADMIN | onHand integer,expectedVersion → số tồn; không thấp hơn reserved |
| GET/POST /admin/toppings; PATCH /admin/toppings/:id | Chưa | ADMIN | tên, giá chuỗi, isAvailable |
| GET/POST /admin/promotions; PATCH /admin/promotions/:id | Chưa | ADMIN | code/type/value/limits/dates/isActive; không hạ quota dưới used+reserved |
| GET /admin/users | Có một phần | ADMIN | target phân trang/isActive, không hash/token |
| PATCH /admin/users/:id | Chưa | ADMIN | whitelist fullName?/isActive?/role?; không mất ADMIN cuối |
| GET /notifications; PATCH /notifications/:id/read | Chưa | User sở hữu | list/event/order link; đánh dấu đã đọc đúng user |

Mọi mutation có CSRF check. Không public quản trị, không customer/ADMIN endpoint set payment SUCCESS. Mock callback là internal contract được xác thực, không gộp vào route quản trị.

## Catalog availability và cart

Product giữ id/name/description/basePrice/imageUrl/isAvailable/category/sizes. Mỗi size bổ sung `{id,name,extraPrice,isAvailable,inventoryStatus,availableQuantity}`; inventoryStatus UNINITIALIZED/AVAILABLE/OUT_OF_STOCK. onHand chưa cấp thì availableQuantity=null, không được đặt; khác với availableQuantity=0. Không tin stockQuantity legacy để cho phép thêm món.

Cart item target gồm id/productId/sizeId/productName/sizeName/toppings/quantity/note/configurationKey/unitPrice/lineTotal/requiresConfiguration. Giá chỉ là preview do server tính hiện tại; không snapshot hóa giỏ như hóa đơn.

```json
{"productId":"uuid","sizeId":"uuid","toppingIds":["uuid"],"quantity":2,"note":"Ít đá","expectedVersion":8}
```

Validate toàn bộ: size thuộc product, product/size đang bán và inventory initialized, topping tồn tại/active, IDs không trùng, quantity 1..20. Không âm thầm bỏ topping, đổi size hoặc cắt quantity. Kiểm tra tổng quantity các cấu hình dùng cùng Size khi checkout.

Merge: key canonical như database baseline; cùng cấu hình gộp, khác note là dòng riêng. Request có ID/key ổn định qua network retry; nếu tổng vượt 20 hoặc options thay đổi thì trả 409 với chi tiết, không mất local. Backend chỉ merge toàn bộ transaction hoặc không ghi; FE chỉ đánh dấu local synchronized sau response thành công. Version đổi trả CART_CHANGED.

## Quote và tạo Order

```json
{
  "items":[{"productId":"uuid","sizeId":"uuid","toppingIds":[],"quantity":2,"note":""}],
  "couponCode":"WELCOME10",
  "pointsUsed":100
}
```

Response target giữ tên field hiện tại: items với unitPrice/lineTotal chuỗi; subtotal,discountAmount,pointsDiscount,finalTotal chuỗi; pointsUsed integer; appliedCoupon; quoteFingerprint. Ví dụ 100000 - 10000 coupon - 10000 điểm = finalTotal "80000".

Quote không ghi Order/reservation/quota/ledger. Availability chỉ là snapshot kiểm tra, không bảo đảm còn hàng. Frontend không gửi amount để tạo payment. POST orders đọc cartVersion, reprice và validate lại trong transaction; quoteFingerprint đổi trả 409 PRICE_CHANGED và quote mới để khách xác nhận. Fingerprint là phát hiện thay đổi, không thay xác thực/giá server.

## Errors ổn định

- INVALID_OPTIONS (400): chỉ rõ line/size/topping không hợp lệ, không chỉnh lựa chọn thay khách.
- INVENTORY_UNINITIALIZED / OUT_OF_STOCK (409): details.items[{sizeId,requested,available}], available null nếu chưa phân bổ.
- CART_CHANGED / PRICE_CHANGED / INVALID_ORDER_TRANSITION (409).
- COUPON_INVALID / COUPON_EXHAUSTED / POINTS_EXCEED_BALANCE / POINTS_EXCEED_CAP (422).
- IDEMPOTENCY_KEY_REUSED / REQUEST_IN_PROGRESS (409, retry guidance), cùng key+payload đã xong trả cùng resource/kết quả logic.
- EMAIL_NOT_VERIFIED (403), SESSION_EXPIRED / REFRESH_REUSED (401), RATE_LIMITED (429).

New contracts không chấp nhận userId để chọn tài khoản. DTO cũ chứa field đó chỉ được duy trì trong bước tương thích và phải bị bỏ qua, trước khi bỏ hẳn ở rollout đã thông báo.