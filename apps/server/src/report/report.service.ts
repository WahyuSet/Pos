import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@repo/types';

const PAID_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
];

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async getSalesSummary(restaurantId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.resolveDateRange(from, to);

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: fromDate, lte: toDate },
        // Payment.status/paidAt tidak reliable untuk transaksi cash — kasir mengonfirmasi lunas
        // lewat OrderService.updateOrderStatus, yang hanya update Order.status dan tidak pernah
        // menyentuh Payment. Order.status adalah satu-satunya sumber kebenaran "sudah bayar".
        status: { in: PAID_STATUSES },
      },
      include: {
        orderItems: { include: { menu: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const dailyRevenue = this.buildDailyRevenue(orders, fromDate, toDate);
    const topMenus = this.buildTopMenus(orders);
    const paymentMethodBreakdown = this.buildPaymentMethodBreakdown(orders);

    return {
      range: { from: this.toDateKey(fromDate), to: this.toDateKey(toDate) },
      totalRevenue,
      totalOrders,
      averageOrderValue,
      dailyRevenue,
      topMenus,
      paymentMethodBreakdown,
    };
  }

  private resolveDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
    const toDate = to ? new Date(`${to}T00:00:00.000Z`) : new Date();
    toDate.setUTCHours(23, 59, 59, 999);

    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : new Date(toDate);
    if (!from) {
      fromDate.setUTCDate(fromDate.getUTCDate() - 6);
    }
    fromDate.setUTCHours(0, 0, 0, 0);

    return { fromDate, toDate };
  }

  private buildDailyRevenue(orders: any[], fromDate: Date, toDate: Date) {
    const dailyMap = new Map<string, { revenue: number; orderCount: number }>();
    for (const d = new Date(fromDate); d <= toDate; d.setUTCDate(d.getUTCDate() + 1)) {
      dailyMap.set(this.toDateKey(d), { revenue: 0, orderCount: 0 });
    }
    for (const order of orders) {
      const key = this.toDateKey(order.createdAt);
      const entry = dailyMap.get(key);
      if (entry) {
        entry.revenue += Number(order.totalAmount);
        entry.orderCount += 1;
      }
    }
    return Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));
  }

  private buildTopMenus(orders: any[]) {
    const menuMap = new Map<
      string,
      { menuId: string; name: string; quantitySold: number; revenue: number }
    >();
    for (const order of orders) {
      for (const item of order.orderItems) {
        const itemRevenue = Number(item.price) * item.quantity;
        const existing = menuMap.get(item.menuId);
        if (existing) {
          existing.quantitySold += item.quantity;
          existing.revenue += itemRevenue;
        } else {
          menuMap.set(item.menuId, {
            menuId: item.menuId,
            name: item.menu.name,
            quantitySold: item.quantity,
            revenue: itemRevenue,
          });
        }
      }
    }
    return Array.from(menuMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private buildPaymentMethodBreakdown(orders: any[]) {
    const methodMap = new Map<string, { method: string; amount: number; orderCount: number }>();
    for (const order of orders) {
      const method = order.payments[0]?.method || 'UNKNOWN';
      const existing = methodMap.get(method);
      if (existing) {
        existing.amount += Number(order.totalAmount);
        existing.orderCount += 1;
      } else {
        methodMap.set(method, { method, amount: Number(order.totalAmount), orderCount: 1 });
      }
    }
    return Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount);
  }

  private toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
