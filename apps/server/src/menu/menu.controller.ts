import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseInterceptors, UseFilters, UploadedFile, BadRequestException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateCategoryDto, CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UploadSizeExceptionFilter } from './upload-size.filter';

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('restaurants/:restaurantId')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('categories')
  async createCategory(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.menuService.createCategory(restaurantId, dto);
  }

  @Public()
  @Get('categories')
  async getCategories(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getCategories(restaurantId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('menus')
  async createMenu(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuDto,
  ) {
    return this.menuService.createMenu(restaurantId, dto);
  }

  @Public()
  @Get('menus')
  async getMenus(
    @Param('restaurantId') restaurantId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.menuService.getMenus(restaurantId, categoryId);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WAITER)
  @Patch('menus/:menuId')
  async updateMenu(
    @Param('restaurantId') restaurantId: string,
    @Param('menuId') menuId: string,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.menuService.updateMenu(restaurantId, menuId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete('menus/:menuId')
  async deleteMenu(
    @Param('restaurantId') restaurantId: string,
    @Param('menuId') menuId: string,
  ) {
    return this.menuService.deleteMenu(restaurantId, menuId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('menus/upload')
  @UseFilters(UploadSizeExceptionFilter)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Tipe file harus berupa gambar (JPG, PNG, WEBP, atau GIF)'), false);
      }
      cb(null, true);
    },
  }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }
    return {
      imageUrl: `http://localhost:3001/uploads/${file.filename}`,
    };
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('categories/:categoryId')
  async updateCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.menuService.updateCategory(restaurantId, categoryId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete('categories/:categoryId')
  async deleteCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.menuService.deleteCategory(restaurantId, categoryId);
  }
}
