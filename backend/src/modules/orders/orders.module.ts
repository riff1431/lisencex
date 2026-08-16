import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { LicensesModule } from '../licenses/licenses.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [LicensesModule, forwardRef(() => CouponsModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
