# UML/source update checklist cho P0

Kiểm tra repository: có `docs/diagrams/usecase-overview.puml`, bản SVG đã xuất và `ClassDiagram.png`. Không thấy nguồn Visual Paradigm/Draw.io của Class Diagram, Activity Diagram hoặc Sequence Diagram; Assignment PDF cũng không có trong docs đã kiểm tra. Không tuyên bố đã sửa/đối chiếu trực tiếp những nguồn không có.

P0 chỉ sửa nhãn/ghi chú của PlantUML overview nguồn text; không sửa PNG/SVG bằng cách ghi đè ảnh, không coi SVG cũ đã được regenerate. ERD trong database-baseline.md là bản đề xuất mới, không thay Class Diagram gốc.

| Artifact | Thay đổi cần làm ở nguồn | Trạng thái |
| --- | --- | --- |
| usecase-overview.puml | Actor CUSTOMER/Guest, STAFF, ADMIN; đăng ký email/password/OTP; không bước set-password sau OTP | Source text được đồng bộ P0; SVG cần render lại bằng công cụ UML trong PR tài liệu |
| ClassDiagram.png / VP source | Role target; Size.onHand/reserved/isAvailable, CartItem.size/key/toppings; 5 bảng; refresh fields; UNKNOWN; snapshots/history/ledger links | PNG tham chiếu giữ nguyên; cần nhóm cung cấp/chỉnh nguồn VP |
| Activity đặt và thanh toán | Menu/options/cart→Xác nhận mua→Auth nếu cần→coupon/points→quote→transaction reprice/reserve→pending→mock result; hết hàng cho sửa; UNKNOWN inquiry | Không có source trong repo; cần nhóm cập nhật |
| Sequence checkout/payment | JWT+CSRF+roles; idempotency; tx boundary; không giữ lock khi gọi mock; verify/dedupe callback; consume/release; refresh rotation | Không có source trong repo; cần nhóm cập nhật |
| UC Task1.3 văn bản | Email thay phone; không thêm màn xem lại đơn bắt buộc; STAFF-only preparation; holds và expiry; FAILED khác Order; UNKNOWN retry gate | Nguồn riêng chưa có; SRS mô tả target, không thay bản UC gốc |
| Deployment | Gmail SMTP, mock payment, HTTPS same-site, credentials/secret và DB private; refresh cookie | Nguồn riêng chưa có; cần bổ sung ở P9/PR kiến trúc |

Khi nhận nguồn: sửa trên bản có version, review với ADR/SRS, xuất lại SVG/PNG và gắn commit/PR; không ghi giảng viên/nhóm đã approved khi chưa có evidence. Các sơ đồ xuất cũ được giữ để tránh giả vờ là bản baseline mới.