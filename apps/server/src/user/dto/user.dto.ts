import { IsString, IsNotEmpty, IsOptional, IsIn, IsBoolean, MinLength } from 'class-validator';
import { Role } from '@repo/types';

export const ASSIGNABLE_ROLES = [Role.MANAGER, Role.CASHIER, Role.KITCHEN, Role.WAITER] as const;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(ASSIGNABLE_ROLES, { message: 'Role tidak valid' })
  role!: Role;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(ASSIGNABLE_ROLES, { message: 'Role tidak valid' })
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
