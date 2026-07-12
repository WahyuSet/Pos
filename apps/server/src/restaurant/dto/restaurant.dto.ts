import { IsString, IsNotEmpty, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsString()
  @IsNotEmpty()
  ownerUsername!: string;

  @IsString()
  @MinLength(6)
  ownerPassword!: string;
}

export class UpdateRestaurantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class UpdateRestaurantStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  number!: string;
}

export class UpdatePaymentSettingsDto {
  @IsBoolean()
  @IsOptional()
  enableCash?: boolean;

  @IsBoolean()
  @IsOptional()
  enableQris?: boolean;

  @IsBoolean()
  @IsOptional()
  enableEWallet?: boolean;

  @IsBoolean()
  @IsOptional()
  enableBankTransfer?: boolean;

  @IsBoolean()
  @IsOptional()
  enableTax?: boolean;

  @IsOptional()
  taxRate?: number;
}
