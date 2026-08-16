import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StorageConfig,
  StorageConfigSchema,
} from '../../database/schemas/storage-config.schema';
import {
  StoredFile,
  StoredFileSchema,
} from '../../database/schemas/stored-file.schema';
import {
  AuditLog,
  AuditLogSchema,
} from '../../database/schemas/audit-log.schema';
import {
  Media,
  MediaSchema,
} from '../../database/schemas/media.schema';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StorageConfig.name, schema: StorageConfigSchema },
      { name: StoredFile.name, schema: StoredFileSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
