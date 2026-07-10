import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto, CreateTableDto, UpdatePaymentSettingsDto } from './dto/restaurant.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async createRestaurant(dto: CreateRestaurantDto) {
    return this.prisma.restaurant.create({
      data: dto,
    });
  }

  async getRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) {
      throw new NotFoundException('Restoran tidak ditemukan');
    }
    return restaurant;
  }

  async createTable(restaurantId: string, dto: CreateTableDto) {
    await this.getRestaurant(restaurantId);

    const tableId = randomUUID();
    const qrCodeUrl = `/order?tableId=${tableId}`;

    return this.prisma.table.create({
      data: {
        id: tableId,
        restaurantId,
        number: dto.number,
        qrCodeUrl,
      },
    });
  }

  async getTables(restaurantId: string) {
    return this.prisma.table.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
    });
  }

  async getTable(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { restaurant: true },
    });
    if (!table) {
      throw new NotFoundException('Meja tidak ditemukan');
    }
    return table;
  }

  async updatePaymentSettings(id: string, dto: UpdatePaymentSettingsDto) {
    await this.getRestaurant(id);
    const data = { ...dto } as any;
    if (data.taxRate !== undefined) {
      data.taxRate = Number(data.taxRate);
    }
    return this.prisma.restaurant.update({
      where: { id },
      data,
    });
  }

  async updateTable(restaurantId: string, tableId: string, dto: { number: string }) {
    const table = await this.getTable(tableId);
    if (table.restaurantId !== restaurantId) {
      throw new NotFoundException('Meja tidak ditemukan untuk restoran ini');
    }
    return this.prisma.table.update({
      where: { id: tableId },
      data: { number: dto.number },
    });
  }

  async deleteTable(restaurantId: string, tableId: string) {
    const table = await this.getTable(tableId);
    if (table.restaurantId !== restaurantId) {
      throw new NotFoundException('Meja tidak ditemukan untuk restoran ini');
    }
    return this.prisma.table.delete({
      where: { id: tableId },
    });
  }
}
