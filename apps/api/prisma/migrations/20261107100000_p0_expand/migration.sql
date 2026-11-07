-- CreateEnum
CREATE TYPE "ReservationState" AS ENUM ('HELD', 'CONSUMED', 'RELEASED');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'UNKNOWN';

-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "refreshTokenHash" TEXT,
ADD COLUMN     "refreshUsedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "configurationKey" TEXT,
ADD COLUMN     "requiresConfiguration" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sizeId" TEXT;

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "loyalty_transactions" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "eventKey" TEXT,
ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "sizeId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "couponCodeSnapshot" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isLegacy" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "promotionId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "attemptNumber" INTEGER,
ADD COLUMN     "providerPaymentId" TEXT;

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "reservedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sizes" ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onHand" INTEGER,
ADD COLUMN     "reserved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reservedPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CartItemTopping" (
    "cartItemId" TEXT NOT NULL,
    "toppingId" TEXT NOT NULL,

    CONSTRAINT "CartItemTopping_pkey" PRIMARY KEY ("cartItemId","toppingId")
);

-- CreateTable
CREATE TABLE "OrderReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "state" "ReservationState" NOT NULL DEFAULT 'HELD',
    "pointsReserved" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "OrderReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "orderVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "outcome" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderReservation_orderId_key" ON "OrderReservation"("orderId");

-- CreateIndex
CREATE INDEX "OrderReservation_state_expiresAt_idx" ON "OrderReservation"("state", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStatusHistory_orderId_orderVersion_key" ON "OrderStatusHistory"("orderId", "orderVersion");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_actorId_operation_key_key" ON "IdempotencyRecord"("actorId", "operation", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_parentId_key" ON "AuthSession"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_configurationKey_key" ON "cart_items"("cartId", "configurationKey");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_transactions_orderId_type_key" ON "loyalty_transactions"("orderId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_eventKey_key" ON "notifications"("eventKey");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerPaymentId_key" ON "payments"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_attemptNumber_key" ON "payments"("orderId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AuthSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemTopping" ADD CONSTRAINT "CartItemTopping_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemTopping" ADD CONSTRAINT "CartItemTopping_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "toppings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReservation" ADD CONSTRAINT "OrderReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sizes" ADD CONSTRAINT "sizes_inventory_valid" CHECK (("onHand" IS NULL AND "reserved" = 0) OR ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand"));
ALTER TABLE "users" ADD CONSTRAINT "users_reserved_points_valid" CHECK ("reservedPoints" >= 0 AND "reservedPoints" <= "loyaltyPoints");
ALTER TABLE "promotions" ADD CONSTRAINT "promotion_quota_valid" CHECK ("reservedCount" >= 0 AND "usedCount" >= 0 AND "usedCount" + "reservedCount" <= "usageLimit");