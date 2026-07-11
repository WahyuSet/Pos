import { Controller, Post, Get, Patch, Body, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/types';

@Controller('restaurants/:restaurantId/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Post()
  createUser(@Param('restaurantId') restaurantId: string, @Body() dto: CreateUserDto) {
    return this.userService.createUser(restaurantId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get()
  getUsers(@Param('restaurantId') restaurantId: string) {
    return this.userService.getUsers(restaurantId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':userId')
  updateUser(
    @Param('restaurantId') restaurantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const requesterId = (req.user as { id: string }).id;
    return this.userService.updateUser(restaurantId, userId, dto, requesterId);
  }
}
