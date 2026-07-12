import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, Role } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecretkey',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { restaurant: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Akun tidak aktif');
    }
    if (user.role !== Role.SUPER_ADMIN && !user.restaurant.isActive) {
      throw new UnauthorizedException('Restoran tidak aktif, hubungi admin platform');
    }
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      restaurantId: payload.restaurantId,
      name: payload.name,
    };
  }
}
