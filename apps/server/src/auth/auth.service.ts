import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@repo/database';
import { Role } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  issueSession(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      restaurantId: user.restaurantId,
      name: user.name,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { restaurantSlug, username, password } = loginDto;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });
    if (!restaurant) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const user = await this.prisma.user.findUnique({
      where: { restaurantId_username: { restaurantId: restaurant.id, username } },
    });

    if (!user) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Username atau password salah');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun tidak aktif, hubungi admin');
    }

    if (user.role !== Role.SUPER_ADMIN && !restaurant.isActive) {
      throw new UnauthorizedException('Restoran tidak aktif, hubungi admin platform');
    }

    return this.issueSession(user);
  }
}
