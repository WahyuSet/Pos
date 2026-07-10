import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async createCategory(restaurantId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        restaurantId,
        name: dto.name,
      },
    });
  }

  async getCategories(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async createMenu(restaurantId: string, dto: CreateMenuDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || category.restaurantId !== restaurantId) {
      throw new NotFoundException('Kategori tidak ditemukan untuk restoran ini');
    }

    return this.prisma.menu.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async getMenus(restaurantId: string, categoryId?: string) {
    return this.prisma.menu.findMany({
      where: {
        restaurantId,
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateMenu(restaurantId: string, menuId: string, dto: UpdateMenuDto) {
    const menu = await this.prisma.menu.findUnique({
      where: { id: menuId },
    });

    if (!menu || menu.restaurantId !== restaurantId) {
      throw new NotFoundException('Menu tidak ditemukan untuk restoran ini');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || category.restaurantId !== restaurantId) {
        throw new NotFoundException('Kategori baru tidak ditemukan');
      }
    }

    return this.prisma.menu.update({
      where: { id: menuId },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable,
      },
    });
  }

  async deleteMenu(restaurantId: string, menuId: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id: menuId },
    });

    if (!menu || menu.restaurantId !== restaurantId) {
      throw new NotFoundException('Menu tidak ditemukan untuk restoran ini');
    }

    return this.prisma.menu.delete({
      where: { id: menuId },
    });
  }

  async updateCategory(restaurantId: string, categoryId: string, dto: CreateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.restaurantId !== restaurantId) {
      throw new NotFoundException('Kategori tidak ditemukan untuk restoran ini');
    }
    return this.prisma.category.update({
      where: { id: categoryId },
      data: { name: dto.name },
    });
  }

  async deleteCategory(restaurantId: string, categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.restaurantId !== restaurantId) {
      throw new NotFoundException('Kategori tidak ditemukan untuk restoran ini');
    }
    return this.prisma.category.delete({
      where: { id: categoryId },
    });
  }
}
