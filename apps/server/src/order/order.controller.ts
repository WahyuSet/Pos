import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role, OrderStatus } from '@repo/types';

@Controller('restaurants/:restaurantId/orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Public()
  @Post()
  async createOrder(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(restaurantId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.KITCHEN, Role.WAITER)
  @Get()
  async getOrders(
    @Param('restaurantId') restaurantId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.getOrders(restaurantId, status);
  }

  @Public()
  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string) {
    return this.orderService.getOrder(orderId);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.KITCHEN, Role.WAITER)
  @Patch(':orderId/status')
  async updateOrderStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(restaurantId, orderId, dto);
  }
}
