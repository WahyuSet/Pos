import { Controller, Post, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '../auth/public.decorator';

@Controller('restaurants/:restaurantId/orders/:orderId/simulate-payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Public()
  @Post()
  async simulatePayment(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentService.simulatePayment(restaurantId, orderId);
  }
}
