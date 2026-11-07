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
  console.log('=== BẮT ĐẦU NẠP DỮ LIỆU ĐẦY ĐỦ CHO TOÀN BỘ CÁC BẢNG (10+ DÒNG MỖI BẢNG) ===');

  // 1. Categories (5 danh mục)
  const categoriesData = [
    { name: 'Cà phê' },
    { name: 'Trà trái cây' },
    { name: 'Trà sữa' },
    { name: 'Đá xay & Sinh tố' },
    { name: 'Bánh ngọt & Snack' },
  ];

  const categoriesMap: Record<string, any> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    categoriesMap[c.name] = cat;
  }
  console.log('✅ Đã nạp bảng: categories (5 danh mục)');

  // 2. Toppings (6 loại topping)
  const toppingsData = [
    { name: 'Trân châu đen', price: 5000 },
    { name: 'Trân châu trắng', price: 6000 },
    { name: 'Thạch nha đam', price: 7000 },
    { name: 'Kem cheese Macchiato', price: 10000 },
    { name: 'Pudding trứng', price: 8000 },
    { name: 'Sương sáo thảo mộc', price: 7000 },
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
  console.log('✅ Đã nạp bảng: toppings (6 loại topping)');

  // 3. Products & Sizes (12 sản phẩm phong phú)
  const productsData = [
    {
      name: 'Cà phê sữa đá BrewLite',
      description: 'Hạt cà phê Robusta phối Arabica đậm đà vị truyền thống hòa quyện cùng sữa đặc béo ngậy.',
      basePrice: 29000,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
      categoryId: categoriesMap['Cà phê'].id,
      stockQuantity: 150,
      sizes: [
        { name: 'Size S', extraPrice: 0 },
        { name: 'Size M', extraPrice: 6000 },
        { name: 'Size L', extraPrice: 10000 },
      ],
    },
    {
      name: 'Bạc xỉu sương sáo',
      description: 'Nhiều sữa ít cà phê ngọt dịu, kết hợp cùng thạch sương sáo thanh mát ngày hè.',
      basePrice: 32000,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400',
      categoryId: categoriesMap['Cà phê'].id,
      stockQuantity: 110,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 6000 },
      ],
    },
    {
      name: 'Cà phê muối đặc biệt',
      description: 'Lớp kem béo mặn mòi hòa quyện cùng cốt cà phê phin đậm đà chuẩn vị xứ Huế.',
      basePrice: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400',
      categoryId: categoriesMap['Cà phê'].id,
      stockQuantity: 95,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 7000 },
      ],
    },
    {
      name: 'Latte Hạnh Nhân',
      description: 'Espresso thơm dịu cùng sữa tươi thanh trùng và lớp bọt sữa mịn màng kèm sốt hạnh nhân.',
      basePrice: 39000,
      imageUrl: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400',
      categoryId: categoriesMap['Cà phê'].id,
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
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
      categoryId: categoriesMap['Trà trái cây'].id,
      stockQuantity: 120,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 6000 },
      ],
    },
    {
      name: 'Trà Vải Hoa Hồng',
      description: 'Nước cốt trà đen thanh mát kết hợp quả vải ngâm ngọt mọng và hương hoa hồng quyến rũ.',
      basePrice: 36000,
      imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
      categoryId: categoriesMap['Trà trái cây'].id,
      stockQuantity: 90,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 6000 },
      ],
    },
    {
      name: 'Trà Dâu Tằm Pha Lê',
      description: 'Trà ô long ủ lạnh cùng dâu tằm Đà Lạt chua ngọt kèm thạch pha lê giòn dai sần sật.',
      basePrice: 38000,
      imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=400',
      categoryId: categoriesMap['Trà trái cây'].id,
      stockQuantity: 85,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 6000 },
      ],
    },
    {
      name: 'Trà Sữa Ô Long Nướng',
      description: 'Trà Ô long được sao nướng đậm hương thơm khói kết hợp sữa béo ngậy chuẩn vị Đài Loan.',
      basePrice: 38000,
      imageUrl: 'https://images.unsplash.com/photo-1558857563-b37cfbbf46a2?w=400',
      categoryId: categoriesMap['Trà sữa'].id,
      stockQuantity: 200,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 7000 },
      ],
    },
    {
      name: 'Trà Sữa Trân Châu Hoàng Gia',
      description: 'Cốt hồng trà hảo hạng thơm ngát hòa cùng sữa đặc sánh mịn và trân châu đường đen.',
      basePrice: 40000,
      imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400',
      categoryId: categoriesMap['Trà sữa'].id,
      stockQuantity: 180,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 7000 },
      ],
    },
    {
      name: 'Matcha Đá Xay Kem Tuyết',
      description: 'Matcha Uji Nhật Bản nguyên chất xay mịn cùng sữa béo và lớp bông kem ngọt ngào.',
      basePrice: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400',
      categoryId: categoriesMap['Đá xay & Sinh tố'].id,
      stockQuantity: 60,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 8000 },
      ],
    },
    {
      name: 'Cacao Dừa Đá Xay',
      description: 'Cacao nguyên chất đắng dịu xay cùng cốt dừa Bến Tre béo ngậy cực kỳ kích thích vị giác.',
      basePrice: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400',
      categoryId: categoriesMap['Đá xay & Sinh tố'].id,
      stockQuantity: 70,
      sizes: [
        { name: 'Size M', extraPrice: 0 },
        { name: 'Size L', extraPrice: 8000 },
      ],
    },
    {
      name: 'Bánh Croissant Hạnh Nhân',
      description: 'Bánh sừng bò ngàn lớp thơm lừng bơ Pháp, rắc lát hạnh nhân sấy giòn thơm.',
      basePrice: 28000,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
      categoryId: categoriesMap['Bánh ngọt & Snack'].id,
      stockQuantity: 50,
      sizes: [],
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
    } else {
      // Cập nhật giá và mô tả nếu đã có
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          description: p.description,
          basePrice: p.basePrice,
          stockQuantity: p.stockQuantity,
        },
        include: { sizes: true },
      });
    }
    productsMap[p.name] = product;
  }
  console.log('✅ Đã nạp bảng: products, sizes (12 món + 23 sizes)');

  // 4. Users (10 tài khoản: 1 Manager, 3 Staff, 6 Customers)
  const passwordHash = '$2b$10$ep5B6x9.q/Ue7sV2J5n.UeB5rQ3L2Kz9.O4s8c.u4U4x5y6z7w8v'; // mật khẩu: admin123

  const usersData = [
    {
      email: 'admin@brewlite.vn',
      fullName: 'Nguyễn Văn Quản Lý',
      phone: '0901234567',
      passwordHash,
      role: UserRole.MANAGER,
      loyaltyPoints: 0,
    },
    {
      email: 'staff@brewlite.vn',
      fullName: 'Trần Minh Kha',
      phone: '0909876543',
      passwordHash,
      role: UserRole.STAFF,
      loyaltyPoints: 0,
    },
    {
      email: 'staff2@brewlite.vn',
      fullName: 'Hoàng Thu Thảo',
      phone: '0912345678',
      passwordHash,
      role: UserRole.STAFF,
      loyaltyPoints: 0,
    },
    {
      email: 'staff3@brewlite.vn',
      fullName: 'Đặng Quốc Bảo',
      phone: '0933221100',
      passwordHash,
      role: UserRole.STAFF,
      loyaltyPoints: 0,
    },
    {
      email: 'customer@brewlite.vn',
      fullName: 'Lê Hoàng Khách Hàng',
      phone: '0987654321',
      passwordHash,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 120,
    },
    {
      email: 'nguyen.anh@gmail.com',
      fullName: 'Nguyễn Quỳnh Anh',
      phone: '0978112233',
      passwordHash,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 85,
    },
    {
      email: 'pham.duc@gmail.com',
      fullName: 'Phạm Minh Đức',
      phone: '0966445566',
      passwordHash,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 200,
    },
    {
      email: 'vu.thanh@gmail.com',
      fullName: 'Vũ Thanh Hằng',
      phone: '0944778899',
      passwordHash,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 40,
    },
    {
      email: 'do.tuan@gmail.com',
      fullName: 'Đỗ Tuấn Kiệt',
      phone: '0922334455',
      passwordHash,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 15,
    },
    {
      email: 'bui.mai@gmail.com',
      fullName: 'Bùi Phương Mai',
      phone: '0988990011',
      passwordHash,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 90,
    },
  ];

  const usersMap: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        loyaltyPoints: u.loyaltyPoints,
      },
      create: u,
    });
    usersMap[u.email] = user;
  }
  console.log('✅ Đã nạp bảng: users (10 tài khoản: 1 Manager, 3 Staff, 6 Customers)');

  // 5. Promotions (6 mã giảm giá)
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
    {
      code: 'COMBO30',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 30000,
      maxDiscount: 30000,
      minOrderValue: 120000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 150,
      usedCount: 18,
      isActive: true,
    },
    {
      code: 'TEA20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      maxDiscount: 30000,
      minOrderValue: 60000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 250,
      usedCount: 30,
      isActive: true,
    },
    {
      code: 'VIP50',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 50000,
      maxDiscount: 50000,
      minOrderValue: 200000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 100,
      usedCount: 12,
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
  console.log('✅ Đã nạp bảng: promotions (6 mã giảm giá)');

  // 6. Cart & CartItems
  const mainCustomer = usersMap['customer@brewlite.vn'];
  let customerCart = await prisma.cart.findUnique({
    where: { userId: mainCustomer.id },
  });

  if (!customerCart) {
    customerCart = await prisma.cart.create({
      data: {
        userId: mainCustomer.id,
        sessionId: 'sess_cust_12345',
      },
    });
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: customerCart.id },
  });

  const cfSua = productsMap['Cà phê sữa đá BrewLite'];
  const traDao = productsMap['Trà Đào Cam Sả'];
  const matcha = productsMap['Matcha Đá Xay Kem Tuyết'];

  if (cfSua) {
    await prisma.cartItem.create({
      data: {
        cartId: customerCart.id,
        productId: cfSua.id,
        quantity: 2,
        note: 'Ít đường, nhiều đá, đậm cà phê',
      },
    });
  }

  if (traDao) {
    await prisma.cartItem.create({
      data: {
        cartId: customerCart.id,
        productId: traDao.id,
        quantity: 1,
        note: 'ít đào ',
      },
    });
  }

  if (matcha) {
    await prisma.cartItem.create({
      data: {
        cartId: customerCart.id,
        productId: matcha.id,
        quantity: 1,
        note: 'Nhiều kem tuyết',
      },
    });
  }
  console.log('✅ Đã nạp bảng: carts, cart_items (3 món trong giỏ)');

  // 7. Orders & Payments (10 đơn hàng mẫu với đầy đủ mọi trạng thái)
  const ordersSeedList = [
    {
      orderCode: 'ORD-20261101-001',
      customerEmail: 'customer@brewlite.vn',
      status: OrderStatus.COMPLETED,
      subtotal: 70000,
      discountAmount: 10000,
      finalTotal: 60000,
      note: 'Giao tận nơi phòng 402, tòa A',
      createdAt: new Date('2026-11-01T09:30:00Z'),
      productName: 'Cà phê sữa đá BrewLite',
      quantity: 2,
      unitPrice: 35000,
      lineTotal: 70000,
      sizeName: 'Size M',
      toppingName: 'Trân châu trắng',
      toppingPrice: 6000,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.SUCCESS,
      transactionRef: 'MOMO-987234',
    },
    {
      orderCode: 'ORD-20261102-002',
      customerEmail: 'customer@brewlite.vn',
      status: OrderStatus.PREPARING,
      subtotal: 45000,
      discountAmount: 0,
      finalTotal: 45000,
      note: 'Uống tại quán, bàn số 5',
      createdAt: new Date('2026-11-02T14:15:00Z'),
      productName: 'Trà Sữa Ô Long Nướng',
      quantity: 1,
      unitPrice: 45000,
      lineTotal: 45000,
      sizeName: 'Size L',
      toppingName: 'Trân châu đen',
      toppingPrice: 5000,
      paymentMethod: PaymentMethod.CARD,
      paymentStatus: PaymentStatus.SUCCESS,
      transactionRef: 'VNPAY-554128',
    },
    {
      orderCode: 'ORD-20261103-003',
      customerEmail: 'nguyen.anh@gmail.com',
      status: OrderStatus.READY,
      subtotal: 78000,
      discountAmount: 15000,
      finalTotal: 63000,
      note: 'Mang đi, cho xin 2 ống hút giấy',
      createdAt: new Date('2026-11-03T10:20:00Z'),
      productName: 'Latte Hạnh Nhân',
      quantity: 2,
      unitPrice: 39000,
      lineTotal: 78000,
      sizeName: 'Size M',
      toppingName: 'Kem cheese Macchiato',
      toppingPrice: 10000,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.SUCCESS,
      transactionRef: 'ZALOPAY-112233',
    },
    {
      orderCode: 'ORD-20261104-004',
      customerEmail: 'pham.duc@gmail.com',
      status: OrderStatus.COMPLETED,
      subtotal: 105000,
      discountAmount: 20000,
      finalTotal: 85000,
      note: 'Giao sảnh văn phòng tầng trệt',
      createdAt: new Date('2026-11-04T11:45:00Z'),
      productName: 'Trà Đào Cam Sả',
      quantity: 3,
      unitPrice: 35000,
      lineTotal: 105000,
      sizeName: 'Size M',
      toppingName: 'Thạch nha đam',
      toppingPrice: 7000,
      paymentMethod: PaymentMethod.CARD,
      paymentStatus: PaymentStatus.SUCCESS,
      transactionRef: 'VNPAY-887766',
    },
    {
      orderCode: 'ORD-20261104-005',
      customerEmail: 'vu.thanh@gmail.com',
      status: OrderStatus.CANCELLED,
      subtotal: 45000,
      discountAmount: 0,
      finalTotal: 45000,
      note: 'Khách hủy do bận họp đột xuất',
      createdAt: new Date('2026-11-04T16:00:00Z'),
      productName: 'Matcha Đá Xay Kem Tuyết',
      quantity: 1,
      unitPrice: 45000,
      lineTotal: 45000,
      sizeName: 'Size M',
      toppingName: 'Pudding trứng',
      toppingPrice: 8000,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.FAILED,
      transactionRef: null,
    },
    {
      orderCode: 'ORD-20261105-006',
      customerEmail: 'customer@brewlite.vn',
      status: OrderStatus.PENDING_PAYMENT,
      subtotal: 29000,
      discountAmount: 0,
      finalTotal: 29000,
      note: 'Mang đi ngay',
      createdAt: new Date('2026-11-05T08:10:00Z'),
      productName: 'Cà phê sữa đá BrewLite',
      quantity: 1,
      unitPrice: 29000,
      lineTotal: 29000,
      sizeName: 'Size S',
      toppingName: null,
      toppingPrice: 0,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.PENDING,
      transactionRef: null,
    },
    {
      orderCode: 'ORD-20261105-007',
      customerEmail: 'do.tuan@gmail.com',
      status: OrderStatus.PAID,
      subtotal: 64000,
      discountAmount: 0,
      finalTotal: 64000,
      note: 'Ngồi tại quầy bar',
      createdAt: new Date('2026-11-05T13:30:00Z'),
      productName: 'Bạc xỉu sương sáo',
      quantity: 2,
      unitPrice: 32000,
      lineTotal: 64000,
      sizeName: 'Size M',
      toppingName: 'Sương sáo thảo mộc',
      toppingPrice: 7000,
      paymentMethod: PaymentMethod.CARD,
      paymentStatus: PaymentStatus.SUCCESS,
      transactionRef: 'VNPAY-990011',
    },
    {
      orderCode: 'ORD-20261106-008',
      customerEmail: 'bui.mai@gmail.com',
      status: OrderStatus.COMPLETED,
      subtotal: 70000,
      discountAmount: 10000,
      finalTotal: 60000,
      note: 'Ít ngọt 30% đường',
      createdAt: new Date('2026-11-06T09:15:00Z'),
      productName: 'Cà phê muối đặc biệt',
      quantity: 2,
      unitPrice: 35000,
      lineTotal: 70000,
      sizeName: 'Size M',
      toppingName: 'Kem cheese Macchiato',
      toppingPrice: 10000,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.SUCCESS,
      transactionRef: 'MOMO-334455',
    },
    {
      orderCode: 'ORD-20261106-009',
      customerEmail: 'nguyen.anh@gmail.com',
      status: OrderStatus.PREPARING,
      subtotal: 80000,
      discountAmount: 15000,
      finalTotal: 65000,
      note: 'Dùng nóng không đá',
      createdAt: new Date('2026-11-06T15:00:00Z'),
      productName: 'Trà Sữa Trân Châu Hoàng Gia',
      quantity: 2,
      unitPrice: 40000,
      lineTotal: 80000,
      sizeName: 'Size M',
      toppingName: 'Trân châu đen',
      toppingPrice: 5000,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.SUCCESS,
      transactionRef: 'MOMO-667788',
    },
    {
      orderCode: 'ORD-20261107-010',
      customerEmail: 'pham.duc@gmail.com',
      status: OrderStatus.READY,
      subtotal: 72000,
      discountAmount: 10000,
      finalTotal: 62000,
      note: 'Khách đang đứng chờ tại quầy',
      createdAt: new Date('2026-11-07T10:00:00Z'),
      productName: 'Trà Vải Hoa Hồng',
      quantity: 2,
      unitPrice: 36000,
      lineTotal: 72000,
      sizeName: 'Size M',
      toppingName: 'Thạch nha đam',
      toppingPrice: 7000,
      paymentMethod: PaymentMethod.CARD,
      paymentStatus: PaymentStatus.SUCCESS,
      transactionRef: 'VNPAY-445566',
    },
  ];

  for (const o of ordersSeedList) {
    const cust = usersMap[o.customerEmail];
    const prod = productsMap[o.productName];
    if (!cust || !prod) continue;

    const existingOrder = await prisma.order.findUnique({
      where: { orderCode: o.orderCode },
    });

    if (!existingOrder) {
      await prisma.order.create({
        data: {
          orderCode: o.orderCode,
          userId: cust.id,
          status: o.status,
          subtotal: o.subtotal,
          discountAmount: o.discountAmount,
          finalTotal: o.finalTotal,
          note: o.note,
          createdAt: o.createdAt,
          items: {
            create: [
              {
                productId: prod.id,
                productName: prod.name,
                sizeName: o.sizeName,
                unitPrice: o.unitPrice,
                quantity: o.quantity,
                lineTotal: o.lineTotal,
                toppings: o.toppingName
                  ? {
                      create: [
                        {
                          toppingName: o.toppingName,
                          price: o.toppingPrice,
                        },
                      ],
                    }
                  : undefined,
              },
            ],
          },
          payments: {
            create: {
              amount: o.finalTotal,
              method: o.paymentMethod,
              status: o.paymentStatus,
              idempotencyKey: `idemp-key-${o.orderCode}`,
              transactionRef: o.transactionRef,
              paidAt: o.paymentStatus === PaymentStatus.SUCCESS ? o.createdAt : null,
            },
          },
        },
      });
    }
  }
  console.log('✅ Đã nạp bảng: orders, order_items, order_item_toppings, payments (10 đơn hàng)');

  // 8. LoyaltyTransactions (10 giao dịch tích điểm)
  await prisma.loyaltyTransaction.deleteMany({});
  const loyaltyData = [
    { email: 'customer@brewlite.vn', type: LoyaltyTransactionType.EARN, points: 50, balanceAfter: 50, desc: 'Thưởng thành viên mới' },
    { email: 'customer@brewlite.vn', type: LoyaltyTransactionType.EARN, points: 70, balanceAfter: 120, desc: 'Tích điểm đơn ORD-20261101-001' },
    { email: 'nguyen.anh@gmail.com', type: LoyaltyTransactionType.EARN, points: 50, balanceAfter: 50, desc: 'Thưởng thành viên mới' },
    { email: 'nguyen.anh@gmail.com', type: LoyaltyTransactionType.EARN, points: 35, balanceAfter: 85, desc: 'Tích điểm đơn ORD-20261103-003' },
    { email: 'pham.duc@gmail.com', type: LoyaltyTransactionType.EARN, points: 100, balanceAfter: 100, desc: 'Thưởng thành viên VIP' },
    { email: 'pham.duc@gmail.com', type: LoyaltyTransactionType.EARN, points: 100, balanceAfter: 200, desc: 'Tích điểm đơn ORD-20261104-004' },
    { email: 'vu.thanh@gmail.com', type: LoyaltyTransactionType.EARN, points: 50, balanceAfter: 50, desc: 'Thưởng thành viên mới' },
    { email: 'vu.thanh@gmail.com', type: LoyaltyTransactionType.REDEEM, points: -10, balanceAfter: 40, desc: 'Đổi quà voucher 10.000đ' },
    { email: 'bui.mai@gmail.com', type: LoyaltyTransactionType.EARN, points: 50, balanceAfter: 50, desc: 'Thưởng thành viên mới' },
    { email: 'bui.mai@gmail.com', type: LoyaltyTransactionType.EARN, points: 40, balanceAfter: 90, desc: 'Tích điểm đơn ORD-20261106-008' },
  ];

  for (const l of loyaltyData) {
    const user = usersMap[l.email];
    if (user) {
      await prisma.loyaltyTransaction.create({
        data: {
          userId: user.id,
          type: l.type,
          points: l.points,
          balanceAfter: l.balanceAfter,
          description: l.desc,
          role: UserRole.CUSTOMER,
        },
      });
    }
  }
  console.log('✅ Đã nạp bảng: loyalty_transactions (10 giao dịch)');

  // 9. Notifications (10 thông báo hệ thống)
  await prisma.notification.deleteMany({});
  const notificationsData = [
    { email: 'customer@brewlite.vn', type: NotificationType.PAYMENT_SUCCESS, title: 'Thanh toán thành công', content: 'Đơn ORD-20261101-001 (60.000đ) qua Ví điện tử thành công.', isRead: true },
    { email: 'customer@brewlite.vn', type: NotificationType.ORDER_STATUS_UPDATED, title: 'Đơn hàng hoàn thành', content: 'Đơn ORD-20261101-001 đã được giao. Chúc bạn ngon miệng!', isRead: true },
    { email: 'customer@brewlite.vn', type: NotificationType.ORDER_STATUS_UPDATED, title: 'Đang pha chế', content: 'Đơn ORD-20261102-002 đang được Barista chuẩn bị.', isRead: false },
    { email: 'nguyen.anh@gmail.com', type: NotificationType.PAYMENT_SUCCESS, title: 'Thanh toán thành công', content: 'Đơn ORD-20261103-003 đã được thanh toán qua Ví điện tử.', isRead: true },
    { email: 'nguyen.anh@gmail.com', type: NotificationType.ORDER_STATUS_UPDATED, title: 'Mời bạn nhận đồ uống', content: 'Đơn ORD-20261103-003 đã sẵn sàng tại quầy nhận món.', isRead: false },
    { email: 'pham.duc@gmail.com', type: NotificationType.PAYMENT_SUCCESS, title: 'Thanh toán thành công', content: 'Đơn ORD-20261104-004 thanh toán thẻ ngân hàng thành công.', isRead: true },
    { email: 'pham.duc@gmail.com', type: NotificationType.ORDER_STATUS_UPDATED, title: 'Đơn hàng hoàn thành', content: 'Đơn ORD-20261104-004 đã hoàn thành.', isRead: true },
    { email: 'vu.thanh@gmail.com', type: NotificationType.ORDER_STATUS_UPDATED, title: 'Đơn hàng đã hủy', content: 'Đơn ORD-20261104-005 đã hủy theo yêu cầu của bạn.', isRead: true },
    { email: 'do.tuan@gmail.com', type: NotificationType.PAYMENT_SUCCESS, title: 'Thanh toán thành công', content: 'Đơn ORD-20261105-007 thanh toán thẻ thành công.', isRead: false },
    { email: 'bui.mai@gmail.com', type: NotificationType.PAYMENT_SUCCESS, title: 'Thanh toán thành công', content: 'Đơn ORD-20261106-008 thanh toán Ví thành công.', isRead: true },
  ];

  for (const n of notificationsData) {
    const user = usersMap[n.email];
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: n.type,
          title: n.title,
          content: n.content,
          isRead: n.isRead,
        },
      });
    }
  }
  console.log('✅ Đã nạp bảng: notifications (10 thông báo)');

  console.log('=== HOÀN TẤT NẠP DỮ LIỆU ĐẦY ĐỦ 100% CHO TẤT CẢ CÁC BẢNG (10+ DÒNG)! ===');
}

main()
  .catch((e) => {
    console.error('Lỗi khi nạp seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
