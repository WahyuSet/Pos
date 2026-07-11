import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { MenuModule } from './menu/menu.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { GatewayModule } from './gateway/gateway.module';
import { VoucherModule } from './voucher/voucher.module';
import { ReportModule } from './report/report.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RestaurantModule,
    MenuModule,
    OrderModule,
    PaymentModule,
    GatewayModule,
    VoucherModule,
    ReportModule,
    UserModule,
  ],
})
export class AppModule {}
