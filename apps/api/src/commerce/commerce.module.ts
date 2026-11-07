import { InventoryModule } from '../inventory/inventory.module';
import { AccountController } from './account.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommerceService } from './commerce.service';
import { StoreAdminService } from './admin.service';
import { StoreAdminController } from './admin.controller';
import {
  ConfiguredCartController,
  OrdersController,
  PaymentsController,
  StaffOrdersController,
} from './commerce.controller';
@Module({
  imports: [AuthModule, InventoryModule],
  controllers: [
    AccountController,
    ConfiguredCartController,
    OrdersController,
    PaymentsController,
    StaffOrdersController,
    StoreAdminController,
  ],
  providers: [CommerceService, StoreAdminService],
})
export class CommerceModule {}
