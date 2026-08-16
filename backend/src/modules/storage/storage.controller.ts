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
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { StorageService } from './storage.service';
import { StorageProviderType } from '../../database/schemas/storage-config.schema';
import { FileCategory, FileVisibility } from '../../database/schemas/stored-file.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ---------------- ADMIN CONFIG & TELEMETRY ----------------

  @Get('admin/storage/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStorageConfigs() {
    return this.storageService.getAllSanitizedConfigs();
  }

  @Patch('admin/storage/config/:provider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateStorageConfig(
    @Param('provider') provider: StorageProviderType,
    @Body() payload: any,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.storageService.updateConfig(provider, payload, actorEmail);
  }

  @Post('admin/storage/test/:provider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async testStorageConnection(
    @Param('provider') provider: StorageProviderType,
    @Body() customConfig: any,
  ) {
    return this.storageService.testProvider(provider, customConfig);
  }

  @Post('admin/storage/set-default/:provider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async setDefaultProvider(
    @Param('provider') provider: StorageProviderType,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.storageService.setDefaultProvider(provider, actorEmail);
  }

  @Get('admin/storage/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStorageStats() {
    return this.storageService.getStorageStats();
  }

  @Get('admin/storage/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStoredFiles(
    @Query('provider') provider?: StorageProviderType,
    @Query('category') category?: FileCategory,
    @Query('visibility') visibility?: FileVisibility,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storageService.getStoredFiles({
      provider,
      category,
      visibility,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Delete('admin/storage/files/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteStoredFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.storageService.deleteStoredFile(fileId, actorEmail);
  }

  @Post('admin/storage/migrate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async migrateStorageFiles(
    @Body()
    body: {
      fromProvider: StorageProviderType;
      toProvider: StorageProviderType;
      category?: FileCategory;
      fileIds?: string[];
    },
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.storageService.migrateFiles(body, actorEmail);
  }

  // ---------------- PUBLIC / SIGNED SERVING ----------------

  @Get('storage/download/:fileId')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, filename } = await this.storageService.getFileBuffer(fileId);

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename || 'download')}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('public/storage/serve/:fileId')
  async servePublicFile(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.storageService.getFileBuffer(fileId);

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }

  @Get('public/media/:filename')
  async servePublicMedia(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.storageService.getFileBuffer(filename);

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }

  @Get('public/media/*')
  async serveWildcardPublicMedia(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const pathPart = req.params[0] || (req.url.split('/public/media/')[1] || '');
    const cleanPath = decodeURIComponent(pathPart.split('?')[0]);
    const { buffer, mimeType } = await this.storageService.getFileBuffer(cleanPath);

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }
}
