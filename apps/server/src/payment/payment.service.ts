import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../gateway/app.gateway';
import { OrderStatus, PaymentStatus, WS_EVENTS, WsOrderPayload } from '@repo/types';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {}

  async simulatePayment(restaurantId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, table: true, orderItems: true },
    });

    if (!order || order.restaurantId !== restaurantId) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Pesanan tidak dalam status menunggu pembayaran');
    }

    const pendingPayment = order.payments.find((p) => p.status === PaymentStatus.PENDING);
    if (!pendingPayment) {
      throw new BadRequestException('Tidak ada pembayaran tertunda untuk pesanan ini');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          transactionId: 'SIM-' + randomUUID().substring(0, 8).toUpperCase(),
          paidAt: new Date(),
        },
      });

      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
        include: { table: true, orderItems: true },
      });
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
