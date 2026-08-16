import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  StorageProvider,
  UploadResult,
  FileMetadataResult,
  TestConnectionResult,
} from './storage-provider.interface';
import { join, normalize, dirname, basename, extname } from 'path';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  statSync,
  copyFileSync,
  renameSync,
} from 'fs';
import * as crypto from 'crypto';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private baseDir: string;
  private baseUrl: string;

  constructor(options?: { uploadDirectory?: string; baseUrl?: string }) {
    this.baseDir = join(
      process.cwd(),
      options?.uploadDirectory || 'uploads',
    );
    this.baseUrl = options?.baseUrl || '/api/v1/public/media';
    this.ensureDirectory(this.baseDir);
  }

  setOptions(options: { uploadDirectory?: string; baseUrl?: string }) {
    if (options.uploadDirectory) {
      this.baseDir = join(process.cwd(), options.uploadDirectory);
      this.ensureDirectory(this.baseDir);
    }
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
  }

  private ensureDirectory(dir: string) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private resolveSafePath(relativePath: string): string {
    // Sanitize path to prevent directory traversal
    const clean = relativePath.replace(/^(\.\.[\/\\])+/, '').replace(/[\0]/g, '');
    const safePath = normalize(join(this.baseDir, clean));

    if (!safePath.startsWith(normalize(this.baseDir))) {
      throw new BadRequestException('Security Violation: Invalid file path traversal detected');
    }

    return safePath;
  }

  async upload(
    fileBuffer: Buffer,
    destinationPath: string,
    mimeType: string,
    isPublic: boolean,
  ): Promise<UploadResult> {
    const fullPath = this.resolveSafePath(destinationPath);
    this.ensureDirectory(dirname(fullPath));

    writeFileSync(fullPath, fileBuffer);

    const url = await this.getUrl(destinationPath);

    return {
      path: destinationPath,
      url,
      sizeBytes: fileBuffer.length,
    };
  }

  async delete(path: string): Promise<boolean> {
    try {
      const fullPath = this.resolveSafePath(path);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (err) {
      this.logger.error(`Failed to delete local file: ${path}`, err);
      return false;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const fullPath = this.resolveSafePath(path);
      return existsSync(fullPath);
    } catch {
      return false;
    }
  }

  async download(path: string): Promise<Buffer> {
    const fullPath = this.resolveSafePath(path);
    if (!existsSync(fullPath)) {
      throw new BadRequestException(`File not found at: ${path}`);
    }
    return readFileSync(fullPath);
  }

  async getUrl(path: string): Promise<string> {
    const filename = basename(path);
    // Return relative public media URL endpoint
    return `${this.baseUrl}/${encodeURIComponent(filename)}`;
  }

  async getSignedUrl(path: string, expiresInSeconds: number = 3600): Promise<string> {
    const filename = basename(path);
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const secret = process.env.JWT_SECRET || 'local_storage_secret_key_123';
    const hash = crypto
      .createHmac('sha256', secret)
      .update(`${path}:${expires}`)
      .digest('hex');

    return `/api/v1/storage/download/${encodeURIComponent(filename)}?expires=${expires}&signature=${hash}`;
  }

  async move(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      const src = this.resolveSafePath(sourcePath);
      const dst = this.resolveSafePath(destPath);
      if (!existsSync(src)) return false;
      this.ensureDirectory(dirname(dst));
      renameSync(src, dst);
      return true;
    } catch (err) {
      this.logger.error(`Failed to move local file from ${sourcePath} to ${destPath}`, err);
      return false;
    }
  }

  async copy(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      const src = this.resolveSafePath(sourcePath);
      const dst = this.resolveSafePath(destPath);
      if (!existsSync(src)) return false;
      this.ensureDirectory(dirname(dst));
      copyFileSync(src, dst);
      return true;
    } catch (err) {
      this.logger.error(`Failed to copy local file from ${sourcePath} to ${destPath}`, err);
      return false;
    }
  }

  async getMetadata(path: string): Promise<FileMetadataResult> {
    const fullPath = this.resolveSafePath(path);
    if (!existsSync(fullPath)) {
      throw new BadRequestException(`File not found: ${path}`);
    }
    const stat = statSync(fullPath);
    return {
      sizeBytes: stat.size,
      lastModified: stat.mtime,
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now();
    const testFileName = `.probe-test-${Date.now()}.tmp`;
    const testFilePath = this.resolveSafePath(testFileName);

    try {
      this.ensureDirectory(this.baseDir);
      writeFileSync(testFilePath, Buffer.from('LicenseNest Local Storage Health Check Probe'));
      if (!existsSync(testFilePath)) {
        throw new Error('Probe file was not created successfully');
      }
      unlinkSync(testFilePath);

      return {
        success: true,
        message: 'Local storage directory verified and writable',
        latencyMs: Date.now() - start,
        details: {
          baseDirectory: this.baseDir,
          baseUrl: this.baseUrl,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Local storage test failed: ${err.message}`,
        latencyMs: Date.now() - start,
        details: { error: err.message },
      };
    }
  }
}
