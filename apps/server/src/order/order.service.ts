import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { AppGateway } from '../gateway/app.gateway';
import { OrderStatus, PaymentStatus, WS_EVENTS, WsOrderPayload } from '@repo/types';
import { randomUUID } from 'crypto';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {}

  async createOrder(restaurantId: string, dto: CreateOrderDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restoran tidak ditemukan');
    }

    const menuIds = dto.items.map((item) => item.menuId);
    const menus = await this.prisma.menu.findMany({
      where: {
        id: { in: menuIds },
        restaurantId,
        isAvailable: true,
      },
    });

    if (menus.length !== menuIds.length) {
      throw new BadRequestException('Beberapa menu tidak tersedia atau tidak ditemukan');
    }

    const menuMap = new Map(menus.map((m) => [m.id, m]));
    let totalAmount = 0;

    const orderItemsData = dto.items.map((item) => {
      const menu = menuMap.get(item.menuId)!;
      const price = Number(menu.price);
      const subtotal = price * item.quantity;
      totalAmount += subtotal;

      return {
        menuId: item.menuId,
        quantity: item.quantity,
        price,
        notes: item.notes,
      };
    });

    let finalAmount = totalAmount;
    if (restaurant.enableTax) {
      const taxRate = Number(restaurant.taxRate) || 10;
      finalAmount = totalAmount + (totalAmount * taxRate) / 100;
    }

    const initialStatus = OrderStatus.PENDING_PAYMENT;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          restaurantId,
          tableId: dto.tableId,
          status: initialStatus,
          totalAmount: finalAmount,
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: {
            include: { menu: true },
          },
          table: true,
        },
      });

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          method: dto.paymentMethod,
          amount: finalAmount,
          status: PaymentStatus.PENDING,
        },
      });

      return newOrder;
    });

    const wsPayload: WsOrderPayload = {
      orderId: order.id,
      restaurantId: order.restaurantId,
      tableNumber: order.table.number,
      status: order.status as OrderStatus,
      totalAmount: Number(order.totalAmount),
      itemsCount: order.orderItems.reduce((acc, curr) => acc + curr.quantity, 0),
      createdAt: order.createdAt.toISOString(),
    };

    this.gateway.broadcastOrderUpdate(restaurantId, WS_EVENTS.ORDER_CREATED, wsPayload);

    return order;
  }

  async getOrders(restaurantId: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        ...(status ? { status } : {}),
      },
      include: {
        orderItems: {
          include: { menu: true },
        },
        table: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { menu: true },
        },
        table: true,
        payments: true,
        restaurant: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    return order;
  }

  async updateOrderStatus(restaurantId: string, orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true, orderItems: true },
    });

    if (!order || order.restaurantId !== restaurantId) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status as OrderStatus },
      include: { table: true, orderItems: true },
    });

    const wsPayload: WsOrderPayload = {
      orderId: updatedOrder.id,
      restaurantId: updatedOrder.restaurantId,
      tableNumber: updatedOrder.table.number,
      status: updatedOrder.status as OrderStatus,
      totalAmount: Number(updatedOrder.totalAmount),
      itemsCount: updatedOrder.orderItems.reduce((acc, curr) => acc + curr.quantity, 0),
      createdAt: updatedOrder.createdAt.toISOString(),
    };

    this.gateway.broadcastOrderUpdate(restaurantId, WS_EVENTS.ORDER_UPDATED, wsPayload);

    return updatedOrder;
  }
}
