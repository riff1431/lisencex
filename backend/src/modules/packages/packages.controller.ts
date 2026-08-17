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
  Req,
  Res,
  StreamableFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, createReadStream, statSync } from 'fs';
import { tmpdir } from 'os';
import { Response, Request } from 'express';
import { PackagesService, UploadPackageDto, PackageActionDto } from './packages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';

// Multer config: store to OS temp dir, 200 MB limit, .zip only
const multerConfig = {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpdir()),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
      cb(null, `upload-${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/octet-stream' ||
      extname(file.originalname).toLowerCase() === '.zip'
    ) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only .zip files are accepted'), false);
    }
  },
};

@Controller()
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  // ── Admin: List all versions for a product ─────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/products/:productId/packages')
  async listVersions(
    @Param('productId') productId: string,
    @Query() query: any,
  ) {
    return this.packagesService.listVersions(productId, query);
  }

  // ── Admin: Upload a new package version ───────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/products/:productId/packages')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadPackage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Attach a .zip file with field name "file".');
    }

    const dto: UploadPackageDto = {
      version:             body.version,
      releaseName:         body.releaseName,
      releaseNotes:        body.releaseNotes,
      releaseChannel:      body.releaseChannel,
      minPhpVersion:       body.minPhpVersion,
      minWordPressVersion: body.minWordPressVersion,
      minNodeVersion:      body.minNodeVersion,
      publishImmediately:  body.publishImmediately === 'true' || body.publishImmediately === true,
      uploadedBy:          req.user?._id?.toString(),
      uploadedByEmail:     req.user?.email,
    };

    if (!dto.version) throw new BadRequestException('version is required');

    return this.packagesService.uploadPackage(productId, file, dto);
  }

  // ── Admin: Package action (approve / publish / archive / disable / enable) ─

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch('admin/products/:productId/packages/:versionId/action')
  async packageAction(
    @Param('productId') productId: string,
    @Param('versionId') versionId: string,
    @Body() dto: PackageActionDto,
    @Req() req: any,
  ) {
    return this.packagesService.packageAction(productId, versionId, dto, req.user?.email);
  }

  // ── Admin: Replace package file for an existing version ───────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/products/:productId/packages/:versionId/replace')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async replacePackage(
    @Param('productId') productId: string,
    @Param('versionId') versionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.packagesService.replacePackageFile(productId, versionId, file, req.user?.email);
  }

  // ── Admin: Generate a signed download URL for any version ─────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/packages/:versionId/download-token')
  async adminDownloadToken(
    @Param('versionId') versionId: string,
    @Req() req: any,
  ) {
    return this.packagesService.adminGenerateDownloadToken(versionId, req.user?.email);
  }

  // ── Customer: Generate download token (license-gated) ─────────────────

  @UseGuards(JwtAuthGuard)
  @Post('customer/products/:productId/download-token')
  async customerDownloadToken(
    @Param('productId') productId: string,
    @Query('versionId') versionId: string,
    @Req() req: any,
  ) {
    if (!versionId) throw new BadRequestException('versionId is required');
    return this.packagesService.generateDownloadToken(
      productId,
      versionId,
      req.user?._id?.toString(),
    );
  }

  // ── Public: Download file via signed token (streams the file) ─────────

  @Get('packages/download/:token')
  @SkipTransform()
  async downloadFile(
    @Param('token') token: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ): Promise<StreamableFile | void> {
    const dl = await this.packagesService.processDownload(
      token,
      req.ip,
      req.headers['user-agent'],
    );

    // If there's an external URL, redirect to it
    if (!dl.storagePath && dl.downloadPackageUrl) {
      res.redirect(302, dl.downloadPackageUrl);
      return;
    }

    if (!dl.storagePath || !existsSync(dl.storagePath)) {
      throw new BadRequestException('Package file not found on server');
    }

    const stat     = statSync(dl.storagePath);
    const stream   = createReadStream(dl.storagePath);
    const filename = encodeURIComponent(dl.filename);

    res.set({
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      stat.size,
      'X-Package-Version':   dl.version,
      'X-Package-Checksum':  dl.fileChecksum ?? '',
      // Prevent any caching of signed download URLs
      'Cache-Control':       'no-store, no-cache, must-revalidate',
      'Pragma':              'no-cache',
    });

    return new StreamableFile(stream);
  }
}
