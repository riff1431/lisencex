import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { SeederService } from './database/seeder.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { TokenModule } from './modules/token/token.module';
import { ActivationsModule } from './modules/activations/activations.module';
import { UpdatesModule } from './modules/updates/updates.module';
import { SecurityModule } from './modules/security/security.module';
import { AuditModule } from './modules/audit/audit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LicensePlansModule } from './modules/license-plans/license-plans.module';
import { PackagesModule } from './modules/packages/packages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocsModule } from './modules/docs/docs.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    TokenModule,
    AuthModule,
    ProductsModule,
    MarketplaceModule,
    PurchasesModule,
    LicensesModule,
    ActivationsModule,
    UpdatesModule,
    SecurityModule,
    AuditModule,
    AnalyticsModule,
    SettingsModule,
    LicensePlansModule,
    PackagesModule,
    NotificationsModule,
    DocsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeederService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
