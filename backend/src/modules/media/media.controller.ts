import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { join, extname } from 'path';
import { existsSync, createReadStream } from 'fs';
import { MediaService, UpdateProductMediaDto } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * 1. Public Media Stream / Serving
   */
  @Get('public/media/:filename')
  async serveMedia(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    // Sanitize to prevent path traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '');
    const filePath = join(this.mediaService.getUploadDir(), safeFilename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Media asset not found');
    }

    const ext = extname(safeFilename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  /**
   * 2. Admin Upload Media File
   */
  @Post('admin/media/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('mediaType') mediaType: string = 'general',
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const actorEmail = user?.email || 'admin@licensenest.internal';
    const result = await this.mediaService.processAndSaveImage(file, mediaType, actorEmail);
    return {
      success: true,
      message: 'Media uploaded successfully',
      data: result,
    };
  }

  /**
   * 3. Admin Update Product Media
   */
  @Post('admin/products/:id/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateProductMedia(
    @Param('id') id: string,
    @Body() dto: UpdateProductMediaDto,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    const product = await this.mediaService.updateProductMedia(id, dto, actorEmail);
    return {
      success: true,
      message: 'Product media updated successfully',
      data: product,
    };
  }

  /**
   * 4. Admin Delete Media File
   */
  @Delete('admin/media/:filename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteMedia(
    @Param('filename') filename: string,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    const result = await this.mediaService.deleteMediaFile(filename, actorEmail);
    return {
      success: true,
      message: result.deleted ? 'Media file deleted' : 'Media file not found',
      data: result,
    };
  }
}
