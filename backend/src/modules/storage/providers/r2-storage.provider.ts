import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  StorageProvider,
  UploadResult,
  FileMetadataResult,
  TestConnectionResult,
} from './storage-provider.interface';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2ProviderConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  publicUrl?: string;
  customDomain?: string;
  pathPrefix?: string;
}

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private client: S3Client | null = null;
  private config: R2ProviderConfig;

  constructor(config?: R2ProviderConfig) {
    if (config) {
      this.setConfig(config);
    }
  }

  setConfig(config: R2ProviderConfig) {
    this.config = config;
    if (config.accountId && config.accessKeyId && config.secretAccessKey && config.bucket) {
      const endpoint =
        config.endpoint ||
        `https://${config.accountId}.r2.cloudflarestorage.com`;

      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    } else {
      this.client = null;
    }
  }

  private getClient(): S3Client {
    if (!this.client) {
      throw new BadRequestException('Cloudflare R2 storage provider is not properly configured');
    }
    return this.client;
  }

  private formatKey(path: string): string {
    const clean = path.replace(/^\/+/, '');
    const prefix = (this.config?.pathPrefix || '').replace(/^\/+|\/+$/g, '');
    return prefix ? `${prefix}/${clean}` : clean;
  }

  async upload(
    fileBuffer: Buffer,
    destinationPath: string,
    mimeType: string,
    isPublic: boolean,
  ): Promise<UploadResult> {
    const client = this.getClient();
    const key = this.formatKey(destinationPath);

    await client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      }),
    );

    const url = await this.getUrl(destinationPath);

    return {
      path: destinationPath,
      url,
      sizeBytes: fileBuffer.length,
    };
  }

  async delete(path: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const key = this.formatKey(path);
      await client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (err) {
      this.logger.error(`Cloudflare R2 delete failed for key: ${path}`, err);
      return false;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const key = this.formatKey(path);
      await client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async download(path: string): Promise<Buffer> {
    const client = this.getClient();
    const key = this.formatKey(path);
    const response = await client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new BadRequestException(`Empty response body from Cloudflare R2 for: ${path}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async getUrl(path: string): Promise<string> {
    const key = this.formatKey(path);

    if (this.config.customDomain) {
      const domain = this.config.customDomain.replace(/\/+$/, '').replace(/^(?:https?:\/\/)?/, 'https://');
      return `${domain}/${key}`;
    }

    if (this.config.publicUrl) {
      const base = this.config.publicUrl.replace(/\/+$/, '');
      return `${base}/${key}`;
    }

    return `https://${this.config.bucket}.${this.config.accountId}.r2.cloudflarestorage.com/${key}`;
  }

  async getSignedUrl(path: string, expiresInSeconds: number = 3600): Promise<string> {
    const client = this.getClient();
    const key = this.formatKey(path);

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  }

  async move(sourcePath: string, destPath: string): Promise<boolean> {
    const copied = await this.copy(sourcePath, destPath);
    if (copied) {
      await this.delete(sourcePath);
      return true;
    }
    return false;
  }

  async copy(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const srcKey = this.formatKey(sourcePath);
      const dstKey = this.formatKey(destPath);

      await client.send(
        new CopyObjectCommand({
          Bucket: this.config.bucket,
          CopySource: `${this.config.bucket}/${srcKey}`,
          Key: dstKey,
        }),
      );
      return true;
    } catch (err) {
      this.logger.error(`R2 copy failed from ${sourcePath} to ${destPath}`, err);
      return false;
    }
  }

  async getMetadata(path: string): Promise<FileMetadataResult> {
    const client = this.getClient();
    const key = this.formatKey(path);

    const head = await client.send(
      new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );

    return {
      sizeBytes: head.ContentLength || 0,
      mimeType: head.ContentType,
      lastModified: head.LastModified,
      etag: head.ETag,
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now();
    const testKey = `_probe_test_${Date.now()}.tmp`;

    try {
      const client = this.getClient();

      // Probe write
      await client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: testKey,
          Body: Buffer.from('LicenseNest Cloudflare R2 Connection Probe'),
          ContentType: 'text/plain',
        }),
      );

      // Probe read/head
      await client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: testKey,
        }),
      );

      // Probe delete
      await client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: testKey,
        }),
      );

      return {
        success: true,
        message: `Successfully connected to Cloudflare R2 bucket "${this.config.bucket}" (Account: ${this.config.accountId})`,
        latencyMs: Date.now() - start,
        details: {
          bucket: this.config.bucket,
          accountId: this.config.accountId,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cloudflare R2 Connection failed: ${err.message}`,
        latencyMs: Date.now() - start,
        details: {
          error: err.name || err.message,
          bucket: this.config?.bucket,
          accountId: this.config?.accountId,
        },
      };
    }
  }
}
