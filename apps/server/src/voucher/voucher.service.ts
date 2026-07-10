import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@repo/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';

@Injectable()
export class VoucherService {
  constructor(private prisma: PrismaService) {}

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  async createVoucher(restaurantId: string, dto: CreateVoucherDto) {
    try {
      return await this.prisma.voucher.create({
        data: {
          restaurantId,
          code: this.normalizeCode(dto.code),
          description: dto.description,
          discountPercent: dto.discountPercent,
          maxDiscountAmount: dto.maxDiscountAmount,
          minPurchaseAmount: dto.minPurchaseAmount ?? 0,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          maxRedemptions: dto.maxRedemptions,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Kode voucher sudah digunakan');
      }
      throw err;
    }
  }

  async getVouchers(restaurantId: string) {
    return this.prisma.voucher.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVoucher(restaurantId: string, voucherId: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });
    if (!voucher || voucher.restaurantId !== restaurantId) {
      throw new NotFoundException('Voucher tidak ditemukan');
    }
    return voucher;
  }

  async updateVoucher(restaurantId: string, voucherId: string, dto: UpdateVoucherDto) {
    await this.getVoucher(restaurantId, voucherId);

    try {
      return await this.prisma.voucher.update({
        where: { id: voucherId },
        data: {
          code: dto.code ? this.normalizeCode(dto.code) : undefined,
          description: dto.description,
          discountPercent: dto.discountPercent,
          maxDiscountAmount: dto.maxDiscountAmount,
          minPurchaseAmount: dto.minPurchaseAmount,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          maxRedemptions: dto.maxRedemptions,
          isActive: dto.isActive,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Kode voucher sudah digunakan');
      }
      throw err;
    }
  }

  async deleteVoucher(restaurantId: string, voucherId: string) {
    await this.getVoucher(restaurantId, voucherId);
    return this.prisma.voucher.delete({
      where: { id: voucherId },
    });
  }

  /**
   * Read-only rule check shared by the /validate endpoint and OrderService.createOrder.
   * Throws with an Indonesian-language message on the first failed rule.
   */
  async evaluateVoucher(restaurantId: string, code: string, subtotal: number) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { restaurantId_code: { restaurantId, code: this.normalizeCode(code) } },
    });
    if (!voucher) {
      throw new NotFoundException('Kode voucher tidak ditemukan');
    }
    if (!voucher.isActive) {
      throw new BadRequestException('Voucher tidak aktif');
    }

    const now = new Date();
    if (voucher.startsAt && now < voucher.startsAt) {
      throw new BadRequestException('Voucher belum berlaku');
    }
    if (voucher.expiresAt && now > voucher.expiresAt) {
      throw new BadRequestException('Voucher sudah kedaluwarsa');
    }

    if (subtotal < voucher.minPurchaseAmount) {
      throw new BadRequestException(
        `Minimal pembelian Rp ${voucher.minPurchaseAmount.toLocaleString('id-ID')} untuk menggunakan voucher ini`,
      );
    }

    if (voucher.maxRedemptions != null && voucher.usedCount >= voucher.maxRedemptions) {
      throw new BadRequestException('Voucher sudah mencapai batas penggunaan');
    }

    let discountAmount = (subtotal * voucher.discountPercent) / 100;
    if (voucher.maxDiscountAmount != null) {
      discountAmount = Math.min(discountAmount, voucher.maxDiscountAmount);
    }

    return { voucher, discountAmount };
  }

  /**
   * Atomically increments usedCount, guarded so a voucher can never exceed maxRedemptions
   * even under concurrent order creation. Must be called inside the same transaction
   * that creates the order. Throws if the guard fails (limit hit in the meantime).
   */
  async redeemVoucher(tx: Prisma.TransactionClient, voucherId: string, maxRedemptions: number | null) {
    const result = await tx.voucher.updateMany({
      where: {
        id: voucherId,
        ...(maxRedemptions != null ? { usedCount: { lt: maxRedemptions } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new BadRequestException('Voucher sudah mencapai batas penggunaan atau tidak lagi valid');
    }
  }
}
