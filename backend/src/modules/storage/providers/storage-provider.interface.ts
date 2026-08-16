export interface UploadResult {
  path: string;
  url: string;
  sizeBytes: number;
}

export interface FileMetadataResult {
  sizeBytes: number;
  mimeType?: string;
  lastModified?: Date;
  etag?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs: number;
  details?: Record<string, any>;
}

export interface StorageProvider {
  /**
   * Upload binary buffer to destination path
   */
  upload(
    fileBuffer: Buffer,
    destinationPath: string,
    mimeType: string,
    isPublic: boolean,
  ): Promise<UploadResult>;

  /**
   * Delete file by path/key
   */
  delete(path: string): Promise<boolean>;

  /**
   * Check if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Retrieve file as Buffer (useful for migrations and serving protected files)
   */
  download(path: string): Promise<Buffer>;

  /**
   * Get public or base URL for public file
   */
  getUrl(path: string): Promise<string>;

  /**
   * Generate temporary expiring signed URL for private download
   */
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;

  /**
   * Move file between paths
   */
  move(sourcePath: string, destPath: string): Promise<boolean>;

  /**
   * Copy file between paths
   */
  copy(sourcePath: string, destPath: string): Promise<boolean>;

  /**
   * Retrieve file metadata
   */
  getMetadata(path: string): Promise<FileMetadataResult>;

  /**
   * Test live connectivity and write/read permissions
   */
  testConnection(): Promise<TestConnectionResult>;
}
