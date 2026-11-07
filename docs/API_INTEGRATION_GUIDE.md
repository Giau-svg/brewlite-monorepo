# BrewLite API — Hướng dẫn Tích hợp Frontend (API Integration Guide)

Frontend để tích hợp 7 màn hình (Menu, Chi tiết món, Giỏ hàng, Checkout, Payment Result, Order Tracking, Staff Orders, Admin).

---

## 1. Thông tin chung & Cách chạy Backend Local

- **Base URL API:** `http://localhost:3001/api`
- **Swagger UI (Xem & Test API trực tiếp trên web):** `http://localhost:3001/api/docs`
- **Nhánh chứa code Backend mới nhất:** `main` (đã merge đầy đủ)
- **Cơ chế xác thực (Auth):** Sử dụng **JWT Bearer Token** trong header:  
  `Authorization: Bearer <access_token>`
- **Các Role chuẩn trong hệ thống:** `CUSTOMER`, `STAFF`, `MANAGER` (Quản lý là `MANAGER` theo đúng Class Diagram).

### Cách khởi động Backend trên máy:

```bash
# 1. Bật database Docker PostgreSQL (port 5433)
docker compose up -d

# 2. Khởi động Backend NestJS
cd apps/api
npm run start:dev
```

### Dữ liệu tài khoản mẫu để test:

| Vai trò                   | Email đăng nhập        | Số điện thoại | Mật khẩu chung | Điểm thưởng |
| ------------------------- | ---------------------- | ------------- | -------------- | ----------- |
| **Quản lý (MANAGER)**     | `admin@brewlite.vn`    | `0901234567`  | `admin123`     | -           |
| **Nhân viên (STAFF)**     | `staff@brewlite.vn`    | `0909876543`  | `admin123`     | -           |
| **Khách hàng (CUSTOMER)** | `customer@brewlite.vn` | `0987654321`  | `admin123`     | 120 điểm    |

### Mã giảm giá mẫu (Voucher):

- `WELCOME10`: Giảm 10% (tối đa 20.000đ, áp dụng cho đơn từ 40.000đ).
- `BREW20K`: Giảm trực tiếp 20.000đ (đơn từ 80.000đ).
- `FREESHIP`: Giảm trực tiếp 15.000đ (đơn từ 50.000đ).

---

## 2. Danh sách Endpoints ĐÃ SẴN SÀNG (Dùng ngay cho Menu, Chi tiết món, Giỏ hàng, Checkout)

### 2.1. Lấy danh sách Menu

- **Endpoint:** `GET /api/products`
- **Response (200 OK):** Mảng các sản phẩm kèm danh mục và các size.

```json
[
  {
    "id": "edff81b8-5541-4229-a997-aec49ea49248",
    "name": "Cà phê sữa đá BrewLite",
    "description": "Hạt cà phê Robusta phối Arabica...",
    "basePrice": "29000.00",
    "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400",
    "stockQuantity": 150,
    "isAvailable": true,
    "category": { "id": "uuid", "name": "Cà phê" },
    "sizes": [
      { "id": "uuid-size-s", "name": "Size S", "extraPrice": "0.00" },
      { "id": "uuid-size-m", "name": "Size M", "extraPrice": "6000.00" },
      { "id": "uuid-size-l", "name": "Size L", "extraPrice": "10000.00" }
    ]
  }
]
```

### 2.2. Lấy chi tiết món & Danh sách Topping

- **Endpoint:** `GET /api/products/:id`
- **Response (200 OK):** Chi tiết 1 món kèm `category`, `sizes` và mảng `availableToppings` để render popup chọn món.

### 2.3. Lấy danh sách toàn bộ Topping

- **Endpoint:** `GET /api/toppings`
- **Response (200 OK):**

```json
[
  {
    "id": "uuid-1",
    "name": "Trân châu đen",
    "price": "5000.00",
    "isAvailable": true
  },
  {
    "id": "uuid-2",
    "name": "Trân châu trắng",
    "price": "6000.00",
    "isAvailable": true
  },
  {
    "id": "uuid-3",
    "name": "Thạch nha đam",
    "price": "7000.00",
    "isAvailable": true
  },
  {
    "id": "uuid-4",
    "name": "Kem cheese Macchiato",
    "price": "10000.00",
    "isAvailable": true
  },
  {
    "id": "uuid-5",
    "name": "Pudding trứng",
    "price": "8000.00",
    "isAvailable": true
  }
]
```

### 2.4. Tính toán tổng tiền Giỏ hàng / Báo giá Checkout (Pricing Engine)

- **Endpoint:** `POST /api/cart/calculate`
- **Mục đích:** Tính đúng số tiền phải trả khi khách thêm/bớt size, topping, nhập mã giảm giá hoặc dùng điểm thưởng.
- **Request Body:**

```json
{
  "items": [
    {
      "productId": "edff81b8-5541-4229-a997-aec49ea49248",
      "sizeId": "uuid-size-m",
      "toppingIds": ["uuid-topping-1"],
      "quantity": 2,
      "note": "Ít đường nhiều đá"
    }
  ],
  "couponCode": "WELCOME10",
  "pointsUsed": 0,
  "userId": "uuid-user-khach-hang"
}
```

- **Response (200 OK):**

```json
{
  "items": [
    {
      "productId": "edff81b8-5541-4229-a997-aec49ea49248",
      "productName": "Cà phê sữa đá BrewLite",
      "sizeName": "Size M",
      "unitPrice": 40000,
      "quantity": 2,
      "toppings": [{ "name": "Trân châu đen", "price": 5000 }],
      "lineTotal": 80000,
      "note": "Ít đường nhiều đá"
    }
  ],
  "subtotal": 80000,
  "discountAmount": 8000,
  "pointsUsed": 0,
  "pointsDiscount": 0,
  "finalTotal": 72000,
  "appliedCoupon": {
    "code": "WELCOME10",
    "discountType": "PERCENTAGE",
    "discountValue": 10
  }
}
```

---

## 3. Các Trạng thái Enums chuẩn (Để FE map màu và nhãn trạng thái)

### 3.1. Trạng thái Đơn hàng (`OrderStatus`)

| Mã Enum           | Ý nghĩa hiển thị             | Màu gợi ý UI       |
| ----------------- | ---------------------------- | ------------------ |
| `PENDING_PAYMENT` | Chờ thanh toán               | Màu vàng / Cam     |
| `PAID`            | Đã thanh toán                | Màu xanh dương     |
| `PREPARING`       | Quầy bar đang pha chế        | Màu tím            |
| `READY`           | Đã pha xong, mời nhận món    | Màu xanh lá        |
| `COMPLETED`       | Đã hoàn thành / Đã nhận hàng | Màu xám / Xanh đậm |
| `CANCELLED`       | Đã hủy đơn                   | Màu đỏ             |

### 3.2. Phương thức & Trạng thái Thanh toán

- **PaymentMethod:** `WALLET` (Ví điện tử), `CARD` (Thẻ ngân hàng / VNPay).
- **PaymentStatus:** `PENDING` (Đang chờ), `SUCCESS` (Thành công), `FAILED` (Thất bại).

---

## 4. Lộ trình tích hợp các API tiếp theo

1. **Auth:** `POST /api/auth/register`, `POST /api/auth/login` (Hỗ trợ đăng nhập bằng Số điện thoại + Mật khẩu, trả về `{ access_token, user }`).
2. **Đặt hàng (Checkout):** `POST /api/orders` (Tạo đơn hàng, trừ kho, tạo transaction thanh toán).
3. **Thanh toán:** `POST /api/orders/:id/payments` (Mô phỏng thanh toán hoặc tạo URL Sandbox VNPay).
4. **Staff & Admin:**
   - Staff: `GET /api/staff/orders`, `PATCH /api/staff/orders/:id/status`.
   - Admin: `POST/PUT/DELETE /api/admin/products`, quản lý khuyến mãi và người dùng.
