import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto, CreateTableDto, UpdatePaymentSettingsDto, UpdateRestaurantDto } from './dto/restaurant.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/types';

@Controller('restaurants')
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @Public()
  @Post()
  async createRestaurant(@Body() dto: CreateRestaurantDto) {
    return this.restaurantService.createRestaurant(dto);
  }

  @Public()
  @Get(':id')
  async getRestaurant(@Param('id') id: string) {
    return this.restaurantService.getRestaurant(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id')
  async updateRestaurant(@Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantService.updateRestaurant(id, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post(':id/tables')
  async createTable(@Param('id') id: string, @Body() dto: CreateTableDto) {
    return this.restaurantService.createTable(id, dto);
  }

  @Public()
  @Get(':id/tables')
  async getTables(@Param('id') id: string) {
    return this.restaurantService.getTables(id);
  }

  @Public()
  @Get('tables/:tableId')
  async getTable(@Param('tableId') tableId: string) {
    return this.restaurantService.getTable(tableId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id/payment-settings')
  async updatePaymentSettings(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentSettingsDto,
  ) {
    return this.restaurantService.updatePaymentSettings(id, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id/tables/:tableId')
  async updateTable(
    @Param('id') restaurantId: string,
    @Param('tableId') tableId: string,
    @Body() dto: { number: string },
  ) {
    return this.restaurantService.updateTable(restaurantId, tableId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete(':id/tables/:tableId')
  async deleteTable(
    @Param('id') restaurantId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.restaurantService.deleteTable(restaurantId, tableId);
  }
}
