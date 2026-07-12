import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@repo/types';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const routeRestaurantId = req.params?.restaurantId ?? req.params?.id;
    if (!routeRestaurantId) {
      return true;
    }

    const { user } = req;
    if (!user) {
      return false;
    }
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    return user.restaurantId === routeRestaurantId;
  }
}
