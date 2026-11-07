import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { EmailService } from './email.service';
import { JwtAuthGuard, OriginGuard, RolesGuard } from './auth.guards';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtAuthGuard, OriginGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, OriginGuard, RolesGuard],
})
export class AuthModule {}
