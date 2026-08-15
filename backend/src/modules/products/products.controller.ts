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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVersionDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ---------------- PUBLIC ROUTES ----------------
  @Get('public/products')
  async getPublicProducts(@Query() query: any) {
    const products = await this.productsService.findAll({
      ...query,
      status: 'active',
    });
    return products;
  }

  @Get('public/products/:slug')
  async getPublicProduct(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  // ---------------- ADMIN ROUTES ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/products')
  async getAdminProducts(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/products/:id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/products')
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch('admin/products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete('admin/products/:id')
  async archiveProduct(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // ---------------- VERSION MANAGEMENT ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/products/:id/versions')
  async createProductVersion(
    @Param('id') id: string,
    @Body() versionDto: CreateProductVersionDto,
  ) {
    return this.productsService.addVersion(id, versionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/products/:id/versions')
  async getProductVersions(@Param('id') id: string) {
    return this.productsService.getVersions(id);
  }
}
