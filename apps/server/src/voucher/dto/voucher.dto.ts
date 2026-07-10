import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsInt, Min, Max, IsDateString, Matches } from 'class-validator';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Kode voucher hanya boleh huruf, angka, - dan _' })
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercent!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minPurchaseAmount?: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxRedemptions?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVoucherDto {
  @IsString()
  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Kode voucher hanya boleh huruf, angka, - dan _' })
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minPurchaseAmount?: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxRedemptions?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ValidateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsNumber()
  @Min(0)
  subtotal!: number;
}
