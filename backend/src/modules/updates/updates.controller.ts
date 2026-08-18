import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { existsSync, statSync, createReadStream } from 'fs';
import { UpdatesService } from './updates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductClientAuthGuard } from '../../common/guards/product-client-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { getClientIp } from '../../common/utils/client-ip.util';

@Controller()
export class UpdatesController {
  constructor(private readonly updatesService: UpdatesService) {}

  @Get('public/products/:slug/updates')
  @UseGuards(ProductClientAuthGuard)
  @Scopes('update')
  async checkUpdates(
    @Param('slug') slug: string,
    @Query('currentVersion') currentVersion: string,
    @Query('token') token: string,
    @Query('domain') domain: string,
    @Req() req: any,
  ) {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : token;

    return this.updatesService.checkForUpdates(
      slug,
      currentVersion,
      bearerToken,
      domain,
    );
  }

  @Get('public/downloads/:token')
  @SkipTransform()
  async downloadPackage(
    @Param('token') downloadToken: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    const result = await this.updatesService.processDownload(
      downloadToken,
      ip,
      userAgent,
    );

    if (result.storagePath && existsSync(result.storagePath)) {
      const stat = statSync(result.storagePath);
      const filename = encodeURIComponent(result.filename || 'package.zip');
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stat.size,
        'X-Package-Version': result.version,
        'X-Package-Checksum': result.fileChecksum || '',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      });
      const stream = createReadStream(result.storagePath);
      return stream.pipe(res);
    }

    if (result.packageUrl) {
      return res.redirect(result.packageUrl);
    }

    return res.status(404).json({ message: 'Package file not found' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/downloads/:productId')
  async generateCustomerDownload(
    @Param('productId') productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.updatesService.generateCustomerDownloadToken(userId, productId);
  }
}
