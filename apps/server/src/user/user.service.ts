import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, User } from '@repo/database';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, ASSIGNABLE_ROLES } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private toSafeUser(user: User) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async createUser(restaurantId: string, dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          restaurantId,
          username: dto.username,
          passwordHash,
          name: dto.name,
          role: dto.role,
        },
      });
      return this.toSafeUser(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Username sudah digunakan');
      }
      throw err;
    }
  }

  async getUsers(restaurantId: string) {
    const users = await this.prisma.user.findMany({
      where: { restaurantId, role: { in: ASSIGNABLE_ROLES as unknown as string[] } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toSafeUser(user));
  }

  private async getUserOrThrow(restaurantId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.restaurantId !== restaurantId) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return user;
  }

  async updateUser(restaurantId: string, userId: string, dto: UpdateUserDto, requesterId: string) {
    const target = await this.getUserOrThrow(restaurantId, userId);

    if (!ASSIGNABLE_ROLES.includes(target.role as (typeof ASSIGNABLE_ROLES)[number])) {
      throw new ForbiddenException('Akun ini tidak dapat dikelola dari sini');
    }
    if (dto.isActive === false && target.id === requesterId) {
      throw new BadRequestException('Anda tidak bisa menonaktifkan akun sendiri');
    }

    const data: Prisma.UserUpdateInput = {
      username: dto.username,
      name: dto.name,
      role: dto.role,
      isActive: dto.isActive,
    };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    try {
      const user = await this.prisma.user.update({ where: { id: userId }, data });
      return this.toSafeUser(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Username sudah digunakan');
      }
      throw err;
    }
  }
}
