import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@repo/database';
import { Role } from '@repo/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateRestaurantDto,
  CreateTableDto,
  UpdatePaymentSettingsDto,
  UpdateRestaurantDto,
  UpdateRestaurantStatusDto,
} from './dto/restaurant.dto';
import { randomUUID } from 'crypto';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'restoran';
}

@Injectable()
export class RestaurantService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async createRestaurant(dto: CreateRestaurantDto) {
    const baseSlug = slugify(dto.slug || dto.name);

    try {
      const { restaurant, owner } = await this.prisma.$transaction(async (tx) => {
        let slug = baseSlug;
        let suffix = 1;
        while (await tx.restaurant.findUnique({ where: { slug } })) {
          suffix += 1;
          slug = `${baseSlug}-${suffix}`;
        }

        const restaurant = await tx.restaurant.create({
          data: {
            name: dto.name,
            slug,
            address: dto.address,
            phone: dto.phone,
          },
        });

        const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);
        const owner = await tx.user.create({
          data: {
            restaurantId: restaurant.id,
            username: dto.ownerUsername,
            passwordHash,
            name: dto.ownerName,
            role: Role.OWNER,
          },
        });

        return { restaurant, owner };
      });

      return this.authService.issueSession(owner);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Kode restoran atau username sudah digunakan');
      }
      throw err;
    }
  }

  async listRestaurants() {
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, orders: true } } },
    });
  }

  async updateStatus(id: string, dto: UpdateRestaurantStatusDto) {
    await this.getRestaurant(id);
    return this.prisma.restaurant.update({
      where: { id },
      data: { isActive: dto.isActive },
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

  async updateRestaurant(id: string, dto: UpdateRestaurantDto) {
    await this.getRestaurant(id);
    return this.prisma.restaurant.update({
      where: { id },
      data: dto,
    });
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
