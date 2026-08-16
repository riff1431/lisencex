import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTagDto,
  QueryCatalogDto,
} from './dto/category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ---------------- PUBLIC STOREFRONT ROUTES ----------------

  @Get('public/categories')
  async getPublicCategories() {
    return this.categoriesService.getPublicCategoriesTree();
  }

  @Get('public/categories/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoriesService.getCategoryBySlug(slug);
  }

  @Get('public/tags')
  async getPublicTags() {
    return this.categoriesService.getPublicTags();
  }

  @Get('public/store/catalog')
  async getCatalog(@Query() query: QueryCatalogDto) {
    return this.categoriesService.getCatalog(query);
  }

  // ---------------- ADMIN CATEGORY ROUTES ----------------

  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAdminCategories() {
    return this.categoriesService.getAllAdminCategories();
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.categoriesService.createCategory(dto, actorEmail);
  }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.categoriesService.updateCategory(id, dto, actorEmail);
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteCategory(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.categoriesService.deleteCategory(id, actorEmail);
  }

  // ---------------- ADMIN TAG ROUTES ----------------

  @Get('admin/tags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAdminTags() {
    return this.categoriesService.getAllAdminTags();
  }

  @Post('admin/tags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createTag(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.categoriesService.createTag(dto, actorEmail);
  }

  @Delete('admin/tags/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteTag(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.categoriesService.deleteTag(id, actorEmail);
  }

  @Post('admin/categories/recalculate-counts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async recalculateCounts() {
    await this.categoriesService.recalculateProductCounts();
    return { success: true };
  }
}
