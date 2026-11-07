import {
  PrismaClient,
  UserRole,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
  LoyaltyTransactionType,
  NotificationType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BẮT ĐẦU NẠP DỮ LIỆU ĐẦY ĐỦ CHO TOÀN BỘ CÁC BẢNG ===');

  // 1. Categories
  const catCoffee = await prisma.category.upsert({
    where: { name: 'Cà phê' },
    update: {},
    create: { name: 'Cà phê' },
  });

  const catTea = await prisma.category.upsert({
    where: { name: 'Trà trái cây' },
    update: {},
    create: { name: 'Trà trái cây' },
  });

  const catMilkTea = await prisma.category.upsert({
    where: { name: 'Trà sữa' },
    update: {},
    create: { name: 'Trà sữa' },
  });

  const catFreeze = await prisma.category.upsert({
    where: { name: 'Đá xay & Matcha' },
    update: {},
    create: { name: 'Đá xay & Matcha' },
  });

  console.log('✅ Đã nạp bảng: categories');

  // 2. Toppings
  const toppingsData = [
    { name: 'Trân châu đen', price: 5000 },
    { name: 'Trân châu trắng', price: 6000 },
    { name: 'Thạch nha đam', price: 7000 },
    { name: 'Kem cheese Macchiato', price: 10000 },
    { name: 'Pudding trứng', price: 8000 },
  ];

  const toppingsMap: Record<string, any> = {};
  for (const t of toppingsData) {
    const topping = await prisma.topping.upsert({
      where: { name: t.name },
      update: { price: t.price },
      create: t,
    });
    toppingsMap[t.name] = topping;
  }
  console.log('✅ Đã nạp bảng: toppings');

  // 3. Products & Sizes
  const productsData = [
    {
      name: 'Cà phê sữa đá BrewLite',
      description: 'Hạt cà phê Robusta phối Arabica đậm đà vị truyền thống hòa quyện cùng sữa đặc béo ngậy.',
      basePrice: 29000,
      imageUrl: '/images/products/ca-phe-sua-da.jpg',
      categoryId: catCoffee.id,
      stockQuantity: 150,
      sizes: [
        { name: 'Size S', extraPrice: 0 },
        { name: 'Size M', extraPrice: 6000 },
        { name: 'Size L', extraPrice: 10000 },
      ],
    },
    {
      name: 'Latte Hạnh Nhân',
      description: 'Espresso thơm dịu cùng sữa tươi thanh trùng và lớp bọt sữa mịn màng kèm sốt hạnh nhân.',
      basePrice: 39000,
      imageUrl: '/images/products/latte-hanh-nhan.jpg',
      categoryId: catCoffee.id,
      stockQuantity: 80,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 8000 },
      ],
    },
    {
      name: 'Trà Đào Cam Sả',
      description: 'Vị trà thơm nồng kết hợp hương cam tươi chua ngọt, miếng đào giòn rụm và sả thơm thư giãn.',
      basePrice: 35000,
      imageUrl: '/images/products/tra-dao-cam-xa.jpg',
      categoryId: catTea.id,
      stockQuantity: 120,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 6000 },
      ],
    },
    {
      name: 'Trà Sữa Ô Long Nướng',
      description: 'Trà Ô long được sao nướng đậm hương thơm khói kết hợp sữa béo ngậy chuẩn vị Đài Loan.',
      basePrice: 38000,
      imageUrl: '/images/products/tra-sua-olong-nuong.jpg',
      categoryId: catMilkTea.id,
      stockQuantity: 200,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 7000 },
      ],
    },
    {
      name: 'Matcha Đá Xay Kem Tuyết',
      description: 'Matcha Uji Nhật Bản nguyên chất xay mịn cùng sữa béo và lớp bông kem ngọt ngào.',
      basePrice: 45000,
      imageUrl: '/images/products/matcha-da-xoay-kem-tuyet.jpg',
      categoryId: catFreeze.id,
      stockQuantity: 60,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 8000 },
      ],
    },
    {
      name: 'Trà Vải Hoa Hồng',
      description: 'Nước cốt trà đen thanh mát kết hợp quả vải ngâm ngọt mọng và hương hoa hồng quyến rũ.',
      basePrice: 36000,
      imageUrl: '/images/products/tra-vai-hoa-hong.jpg',
      categoryId: catTea.id,
      stockQuantity: 90,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 6000 },
      ],
    },
  ];

  const productsMap: Record<string, any> = {};
  for (const p of productsData) {
    let product = await prisma.product.findFirst({
      where: { name: p.name },
      include: { sizes: true },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          basePrice: p.basePrice,
          imageUrl: p.imageUrl,
          categoryId: p.categoryId,
          stockQuantity: p.stockQuantity,
          sizes: {
            create: p.sizes,
          },
        },
        include: { sizes: true },
      });
    } else if (product.imageUrl !== p.imageUrl) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: p.imageUrl },
        include: { sizes: true },
      });
    }
    productsMap[p.name] = product;
  }
  console.log('✅ Đã nạp bảng: products, sizes');

  // 4. Users (Manager, Staff, Customer)
  const passwordHash = '$2b$10$ep5B6x9.q/Ue7sV2J5n.UeB5rQ3L2Kz9.O4s8c.u4U4x5y6z7w8v'; // admin123

  const managerUser = await prisma.user.upsert({
    where: { email: 'admin@brewlite.vn' },
    update: {},
    create: {
      email: 'admin@brewlite.vn',
      fullName: 'Nguyễn Văn Quản Lý',
      phone: '0901234567',
      passwordHash,
      role: UserRole.MANAGER,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@brewlite.vn' },
    update: {},
    create: {
      email: 'staff@brewlite.vn',
      fullName: 'Trần Thị Thu Ngân',
      phone: '0909876543',
      passwordHash,
      role: UserRole.STAFF,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@brewlite.vn' },
    update: {},
    create: {
      email: 'customer@brewlite.vn',
      fullName: 'Lê Hoàng Khách Hàng',
      phone: '0987654321',
      passwordHash,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 120,
    },
  });
  console.log('✅ Đã nạp bảng: users (MANAGER, STAFF, CUSTOMER)');

  // 5. Promotions
  const promotionsData = [
    {
      code: 'WELCOME10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      maxDiscount: 20000,
      minOrderValue: 40000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 500,
      usedCount: 24,
      isActive: true,
    },
    {
      code: 'BREW20K',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 20000,
      maxDiscount: 20000,
      minOrderValue: 80000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 200,
      usedCount: 15,
      isActive: true,
    },
    {
      code: 'FREESHIP',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 15000,
      maxDiscount: 15000,
      minOrderValue: 50000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 300,
      usedCount: 42,
      isActive: true,
    },
  ];

  for (const promo of promotionsData) {
    await prisma.promotion.upsert({
      where: { code: promo.code },
      update: promo,
      create: promo,
    });
  }
  console.log('✅ Đã nạp bảng: promotions');

  // 6. Cart & CartItems
  let customerCart = await prisma.cart.findUnique({
    where: { userId: customerUser.id },
  });

  if (!customerCart) {
    customerCart = await prisma.cart.create({
      data: {
        userId: customerUser.id,
        sessionId: 'sess_cust_12345',
      },
    });
  }

  // Xóa item cũ trong giỏ nếu có để seed lại gọn gàng
  await prisma.cartItem.deleteMany({
    where: { cartId: customerCart.id },
  });

  const coffeeProduct = productsMap['Cà phê sữa đá BrewLite'];
  const teaProduct = productsMap['Trà Đào Cam Sả'];

  if (coffeeProduct) {
    await prisma.cartItem.create({
      data: {
        cartId: customerCart.id,
        productId: coffeeProduct.id,
        quantity: 2,
        note: 'Ít đường, nhiều đá, đậm cà phê',
      },
    });
  }

  if (teaProduct) {
    await prisma.cartItem.create({
      data: {
        cartId: customerCart.id,
        productId: teaProduct.id,
        quantity: 1,
        note: 'Nhiều đào giòn',
      },
    });
  }
  console.log('✅ Đã nạp bảng: carts, cart_items');

  // 7. Orders, OrderItems, OrderItemToppings, Payments
  // Đơn hàng 1: COMPLETED (Đã thanh toán ví thành công & giao xong)
  const existingOrder1 = await prisma.order.findUnique({
    where: { orderCode: 'ORD-20261101-001' },
  });

  if (!existingOrder1 && coffeeProduct && teaProduct) {
    const order1 = await prisma.order.create({
      data: {
        orderCode: 'ORD-20261101-001',
        userId: customerUser.id,
        status: OrderStatus.COMPLETED,
        subtotal: 70000,
        discountAmount: 10000,
        pointsUsed: 0,
        pointsDiscount: 0,
        finalTotal: 60000,
        note: 'Giao tận nơi phòng 402, tòa A',
        createdAt: new Date('2026-11-01T09:30:00Z'),
        items: {
          create: [
            {
              productId: coffeeProduct.id,
              productName: coffeeProduct.name,
              sizeName: 'Size M',
              unitPrice: 35000,
              quantity: 1,
              lineTotal: 41000,
              note: 'Ít đường',
              toppings: {
                create: [
                  {
                    toppingName: 'Trân châu trắng',
                    price: 6000,
                  },
                ],
              },
            },
            {
              productId: teaProduct.id,
              productName: teaProduct.name,
              sizeName: 'Size M',
              unitPrice: 35000,
              quantity: 1,
              lineTotal: 35000,
              note: 'Bình thường',
            },
          ],
        },
        payments: {
          create: {
            amount: 60000,
            method: PaymentMethod.WALLET,
            status: PaymentStatus.SUCCESS,
            idempotencyKey: 'idemp-key-ord-001',
            transactionRef: 'MOMO-WALLET-987234',
            paidAt: new Date('2026-11-01T09:32:15Z'),
          },
        },
      },
    });
  }

  // Đơn hàng 2: PREPARING (Đang pha chế, đã thanh toán thẻ)
  const existingOrder2 = await prisma.order.findUnique({
    where: { orderCode: 'ORD-20261102-002' },
  });

  const milkTeaProduct = productsMap['Trà Sữa Ô Long Nướng'];
  if (!existingOrder2 && milkTeaProduct) {
    await prisma.order.create({
      data: {
        orderCode: 'ORD-20261102-002',
        userId: customerUser.id,
        status: OrderStatus.PREPARING,
        subtotal: 45000,
        discountAmount: 0,
        pointsUsed: 0,
        pointsDiscount: 0,
        finalTotal: 45000,
        note: 'Uống tại quán, bàn số 5',
        createdAt: new Date('2026-11-02T14:15:00Z'),
        items: {
          create: [
            {
              productId: milkTeaProduct.id,
              productName: milkTeaProduct.name,
              sizeName: 'Size L',
              unitPrice: 45000,
              quantity: 1,
              lineTotal: 45000,
              note: '50% đường, 70% đá',
              toppings: {
                create: [
                  {
                    toppingName: 'Trân châu đen',
                    price: 5000,
                  },
                  {
                    toppingName: 'Kem cheese Macchiato',
                    price: 10000,
                  },
                ],
              },
            },
          ],
        },
        payments: {
          create: {
            amount: 45000,
            method: PaymentMethod.CARD,
            status: PaymentStatus.SUCCESS,
            idempotencyKey: 'idemp-key-ord-002',
            transactionRef: 'VNPAY-CARD-554128',
            paidAt: new Date('2026-11-02T14:16:05Z'),
          },
        },
      },
    });
  }

  // Đơn hàng 3: PENDING_PAYMENT (Khách vừa bấm đặt đơn, đang chờ thanh toán)
  const existingOrder3 = await prisma.order.findUnique({
    where: { orderCode: 'ORD-20261104-003' },
  });

  if (!existingOrder3 && coffeeProduct) {
    await prisma.order.create({
      data: {
        orderCode: 'ORD-20261104-003',
        userId: customerUser.id,
        status: OrderStatus.PENDING_PAYMENT,
        subtotal: 29000,
        discountAmount: 0,
        pointsUsed: 0,
        pointsDiscount: 0,
        finalTotal: 29000,
        note: 'Mang đi ngay',
        createdAt: new Date(),
        items: {
          create: [
            {
              productId: coffeeProduct.id,
              productName: coffeeProduct.name,
              sizeName: 'Size S',
              unitPrice: 29000,
              quantity: 1,
              lineTotal: 29000,
            },
          ],
        },
        payments: {
          create: {
            amount: 29000,
            method: PaymentMethod.WALLET,
            status: PaymentStatus.PENDING,
            idempotencyKey: 'idemp-key-ord-003',
          },
        },
      },
    });
  }
  console.log('✅ Đã nạp bảng: orders, order_items, order_item_toppings, payments');

  // 8. LoyaltyTransactions (Lịch sử tích điểm)
  await prisma.loyaltyTransaction.deleteMany({
    where: { userId: customerUser.id },
  });

  await prisma.loyaltyTransaction.createMany({
    data: [
      {
        userId: customerUser.id,
        type: LoyaltyTransactionType.EARN,
        points: 50,
        balanceAfter: 50,
        description: 'Thưởng đăng ký tài khoản thành viên mới',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2026-10-25T10:00:00Z'),
      },
      {
        userId: customerUser.id,
        type: LoyaltyTransactionType.EARN,
        points: 70,
        balanceAfter: 120,
        description: 'Tích điểm từ đơn hàng hoàn thành ORD-20261101-001',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2026-11-01T09:35:00Z'),
      },
    ],
  });
  console.log('✅ Đã nạp bảng: loyalty_transactions');

  // 9. Notifications (Thông báo)
  await prisma.notification.deleteMany({
    where: { userId: customerUser.id },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: customerUser.id,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Thanh toán thành công',
        content: 'Đơn hàng ORD-20261101-001 trị giá 60.000đ đã được thanh toán qua Ví điện tử.',
        isRead: true,
        createdAt: new Date('2026-11-01T09:32:20Z'),
      },
      {
        userId: customerUser.id,
        type: NotificationType.ORDER_STATUS_UPDATED,
        title: 'Đơn hàng hoàn thành',
        content: 'Đơn hàng ORD-20261101-001 đã giao thành công. Chúc bạn ngon miệng!',
        isRead: true,
        createdAt: new Date('2026-11-01T10:00:00Z'),
      },
      {
        userId: customerUser.id,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Thanh toán thành công',
        content: 'Đơn hàng ORD-20261102-002 trị giá 45.000đ đã được thanh toán qua Thẻ ngân hàng.',
        isRead: false,
        createdAt: new Date('2026-11-02T14:16:10Z'),
      },
      {
        userId: customerUser.id,
        type: NotificationType.ORDER_STATUS_UPDATED,
        title: 'Đơn hàng đang chuẩn bị',
        content: 'Quầy bar đang pha chế món cho đơn hàng ORD-20261102-002.',
        isRead: false,
        createdAt: new Date('2026-11-02T14:17:00Z'),
      },
    ],
  });
  console.log('✅ Đã nạp bảng: notifications');

  console.log('=== HOÀN TẤT NẠP DỮ LIỆU ĐẦY ĐỦ 100% CHO TẤT CẢ CÁC BẢNG! ===');
}

main()
  .catch((e) => {
    console.error('Lỗi khi nạp seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
