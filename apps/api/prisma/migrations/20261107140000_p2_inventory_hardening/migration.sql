-- P2 metadata/constraints only: no rows, historical snapshots or stock are rewritten.
-- FK replacements below strengthen integrity; they do not drop tables or data.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
-- CreateEnum
CREATE TYPE "IdempotencyProcessingStatus" AS ENUM ('IN_PROGRESS', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentEventProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'REQUIRES_REVIEW');

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_sizeId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_sizeId_fkey";

-- DropForeignKey
ALTER TABLE "sizes" DROP CONSTRAINT "sizes_productId_fkey";

-- AlterTable
ALTER TABLE "IdempotencyRecord" ADD COLUMN     "processingStatus" "IdempotencyProcessingStatus" NOT NULL DEFAULT 'SUCCEEDED';

-- AlterTable
ALTER TABLE "OrderReservation" ADD COLUMN     "createdAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentEvent" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" "PaymentEventProcessingStatus" NOT NULL DEFAULT 'RECEIVED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sizes" ALTER COLUMN "productId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "CartItemTopping_toppingId_idx" ON "CartItemTopping"("toppingId");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_actorId_idx" ON "OrderStatusHistory"("actorId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_receivedAt_idx" ON "PaymentEvent"("paymentId", "receivedAt");

-- CreateIndex
CREATE INDEX "cart_items_sizeId_idx" ON "cart_items"("sizeId");

-- CreateIndex
CREATE INDEX "order_items_sizeId_idx" ON "order_items"("sizeId");

-- CreateIndex
CREATE UNIQUE INDEX "sizes_id_productId_key" ON "sizes"("id", "productId");

-- AddForeignKey
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_sizeId_productId_fkey" FOREIGN KEY ("sizeId", "productId") REFERENCES "sizes"("id", "productId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sizeId_productId_fkey" FOREIGN KEY ("sizeId", "productId") REFERENCES "sizes"("id", "productId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Explicit IS NOT NULL avoids PostgreSQL CHECK accepting UNKNOWN for NULL stock.
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_inventory_initialized_valid"
  CHECK (reserved >= 0 AND (("onHand" IS NULL AND reserved = 0) OR ("onHand" IS NOT NULL AND "onHand" >= 0 AND reserved <= "onHand")));
-- Same whitespace set as JavaScript String.trim(); preserve stored display names.
CREATE UNIQUE INDEX "sizes_product_normalized_name_key" ON "sizes"
  ("productId", lower(btrim(name, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')));
-- Failed/pending attempts remain 0..n; only one SUCCESS is allowed per order.
CREATE UNIQUE INDEX "payments_single_success_per_order" ON "payments" ("orderId") WHERE status = 'SUCCESS';
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_quantity_valid" CHECK (quantity BETWEEN 1 AND 20);
ALTER TABLE "carts" ADD CONSTRAINT "carts_version_nonnegative" CHECK (version >= 0);
ALTER TABLE "OrderReservation" ADD CONSTRAINT "reservation_points_nonnegative" CHECK ("pointsReserved" >= 0);
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "history_version_nonnegative" CHECK ("orderVersion" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payment_attempt_valid" CHECK ("attemptNumber" IS NULL OR "attemptNumber" BETWEEN 1 AND 3);
COMMIT;