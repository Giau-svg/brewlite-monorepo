# RBAC và bootstrap ADMIN

Target: CUSTOMER (khách), STAFF (pha chế), ADMIN (chủ cửa hàng). MANAGER là legacy, không alias tự động sang ADMIN. JWT Guard kiểm tra phiên/isActive/emailVerifiedAt; role lấy từ DB. Roles Guard và ownership cùng được áp dụng, deny by default.

| API/chức năng | Guest | CUSTOMER | STAFF | ADMIN |
| --- | --- | --- | --- | --- |
| Menu/detail/catalog public | Có | Có | Có | Có |
| Giỏ local | Có | Có | Không thuộc workflow | Không thuộc workflow |
| Giỏ DB/merge/quote | Không | Chính mình | Không | Không |
| Tạo/hủy/thanh toán đơn cá nhân | Không | Chính mình | Không | Không |
| Lịch sử/chi tiết đơn cá nhân | Không | Chính mình | Không | Không |
| Hàng đợi PAID/PREPARING/READY | Không | Không | Có | Chỉ đọc |
| PAID→PREPARING→READY→COMPLETED | Không | Không | Có | Không |
| Toàn bộ đơn để giám sát | Không | Không | Không | Chỉ đọc |
| Catalog/Size inventory/promotion | Không | Không | Không | Có |
| Liệt kê/disable/gán role User | Không | Không | Không | Có, whitelist và chống mất ADMIN cuối |
| Tự đặt payment SUCCESS | Không | Không | Không | Không |

STAFF không xem đơn PENDING_PAYMENT qua hàng đợi; ADMIN xem qua /admin/orders nhưng không sửa tiến độ. Callback mock là actor hệ thống riêng có kiểm chứng nguồn, không phải đặc quyền ADMIN. UI route chỉ là hỗ trợ; gọi HTTP trực tiếp vẫn bị kiểm tra.

## Bootstrap có kiểm soát — thiết kế P1, chưa có script chạy

1. Chỉ local/development/demo được nhóm cho phép; production mặc định từ chối.
2. Người phụ trách đăng ký một tài khoản CUSTOMER thật bằng email/password và xác minh Gmail OTP. Không tự đánh dấu verified.
3. Nhóm xác nhận đúng email/ID chủ cửa hàng và ghi approval/ticket. Không dùng danh sách toàn bộ MANAGER làm đầu vào.
4. Công cụ CLI nội bộ dự kiến `apps/api/scripts/bootstrap-admin.ts`, chạy từ môi trường tin cậy, xác nhận đích và môi trường; không có HTTP elevate route, không đưa password vào argv.
5. Mặc định chỉ bootstrap ADMIN đầu tiên nếu chưa có ADMIN hoạt động. Nếu đã có ADMIN, từ chối và dùng quy trình quản trị được phê duyệt. Chạy lặp trên đúng tài khoản đã bootstrap là no-op.
6. Transaction kiểm tra account tồn tại, isActive, emailVerifiedAt; khóa kiểm tra bootstrap để hai lần chạy đồng thời không cùng nâng người khác. Ghi receipt kiểm soát trong hồ sơ vận hành được bảo vệ; không tạo bảng thứ sáu chỉ cho bước này.
7. Nếu là MANAGER legacy, chỉ chuyển đúng ID trong mapping được review; không reset mật khẩu hoặc sửa xác minh. Các MANAGER chưa mapping bị chặn API mới, không xóa hoặc âm thầm cấp ADMIN.
8. Kiểm thử CUSTOMER/STAFF không nâng quyền, account chưa verified bị từ chối, duplicate bootstrap, bootstrap đồng thời và chặn production. Không chạy bootstrap trong P0.

Public register bỏ qua/từ chối role do client gửi và luôn CUSTOMER. API đổi role không nhận trường ngoài whitelist, không cho người dùng tự nâng quyền; không vô hiệu hóa/hạ ADMIN hoạt động cuối cùng nếu chưa có phương án thay thế. Việc phân quyền phải được review riêng, không suy rằng ADMIN được mọi thao tác.