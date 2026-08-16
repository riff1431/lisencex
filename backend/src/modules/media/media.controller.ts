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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MediaService, QueryMediaDto, UpdateMediaDto } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { FileCategory, FileVisibility } from '../../database/schemas/stored-file.schema';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ---------------- ADMIN MEDIA LIBRARY ENDPOINTS ----------------

  @Get('admin/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMediaList(@Query() query: QueryMediaDto) {
    return this.mediaService.getMediaList(query);
  }

  @Get('admin/media/folders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMediaFoldersStats() {
    return this.mediaService.getMediaFoldersStats();
  }

  @Get('admin/media/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMediaById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Post('admin/media/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
    @Body('type') legacyType: string,
    @Body('title') title: string,
    @Body('visibility') visibility: FileVisibility,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided in form-data');
    }
    const actorEmail = user?.email || 'admin@licensenest.internal';
    const targetFolder = folder || legacyType || 'general';

    return this.mediaService.uploadMedia(
      file,
      targetFolder,
      actorEmail,
      title,
      visibility || FileVisibility.PUBLIC,
    );
  }

  @Post('admin/media/batch-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 20))
  @HttpCode(HttpStatus.CREATED)
  async batchUploadMedia(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder: string,
    @CurrentUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const actorEmail = user?.email || 'admin@licensenest.internal';
    const targetFolder = folder || 'general';

    const uploaded: any[] = [];
    for (const f of files) {
      const item = await this.mediaService.uploadMedia(f, targetFolder, actorEmail);
      uploaded.push(item);
    }

    return {
      success: true,
      count: uploaded.length,
      items: uploaded,
    };
  }

  @Patch('admin/media/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateMediaMetadata(
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.mediaService.updateMediaMetadata(id, dto, actorEmail);
  }

  @Post('admin/media/:id/replace')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async replaceMediaFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.mediaService.replaceMediaFile(id, file, actorEmail);
  }

  @Delete('admin/media/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteMedia(
    @Param('id') id: string,
    @Query('force') force: string,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    const isForced = force === 'true' || force === '1';
    return this.mediaService.deleteMedia(id, isForced, actorEmail);
  }

  @Post('admin/media/bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkDeleteMedia(
    @Body('mediaIds') mediaIds: string[],
    @Body('force') force: boolean,
    @CurrentUser() user: any,
  ) {
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      throw new BadRequestException('mediaIds array is required');
    }
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.mediaService.bulkDeleteMedia(mediaIds, Boolean(force), actorEmail);
  }

  @Post('admin/media/bulk-folder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkUpdateFolder(
    @Body('mediaIds') mediaIds: string[],
    @Body('folder') folder: FileCategory,
    @CurrentUser() user: any,
  ) {
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      throw new BadRequestException('mediaIds array is required');
    }
    if (!folder) {
      throw new BadRequestException('folder is required');
    }
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.mediaService.bulkUpdateFolder(mediaIds, folder, actorEmail);
  }
}
