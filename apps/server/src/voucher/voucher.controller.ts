import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto, UpdateVoucherDto, ValidateVoucherDto } from './dto/voucher.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/types';

@Controller('restaurants/:restaurantId/vouchers')
export class VoucherController {
  constructor(private voucherService: VoucherService) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Post()
  async createVoucher(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateVoucherDto,
  ) {
    return this.voucherService.createVoucher(restaurantId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get()
  async getVouchers(@Param('restaurantId') restaurantId: string) {
    return this.voucherService.getVouchers(restaurantId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get(':voucherId')
  async getVoucher(
    @Param('restaurantId') restaurantId: string,
    @Param('voucherId') voucherId: string,
  ) {
    return this.voucherService.getVoucher(restaurantId, voucherId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':voucherId')
  async updateVoucher(
    @Param('restaurantId') restaurantId: string,
    @Param('voucherId') voucherId: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.voucherService.updateVoucher(restaurantId, voucherId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete(':voucherId')
  async deleteVoucher(
    @Param('restaurantId') restaurantId: string,
    @Param('voucherId') voucherId: string,
  ) {
    return this.voucherService.deleteVoucher(restaurantId, voucherId);
  }

  @Public()
  @Post('validate')
  async validateVoucher(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: ValidateVoucherDto,
  ) {
    const { voucher, discountAmount } = await this.voucherService.evaluateVoucher(
      restaurantId,
      dto.code,
      dto.subtotal,
    );
    return { voucher, discountAmount };
  }
}
