import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;
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
