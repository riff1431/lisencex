import { Test, TestingModule } from '@nestjs/testing';
import { ActivationsService } from './activations.service';
import { getModelToken } from '@nestjs/mongoose';
import { Activation } from '../../database/schemas/activation.schema';
import { Installation } from '../../database/schemas/installation.schema';
import { ActivationToken } from '../../database/schemas/activation-token.schema';
import { License } from '../../database/schemas/license.schema';
import { Product } from '../../database/schemas/product.schema';
import { Purchase } from '../../database/schemas/purchase.schema';
import { ValidationLog } from '../../database/schemas/validation-log.schema';
import { BlockedEntity } from '../../database/schemas/blocked-entity.schema';
import { AuditLog } from '../../database/schemas/audit-log.schema';
import { TokenService } from '../token/token.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivationStatus, LicenseStatus } from '../../common/enums/app.enums';

describe('ActivationsService Health Checking', () => {
  let service: ActivationsService;

  const mockModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockTokenService = {};
  const mockNotificationsService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivationsService,
        { provide: getModelToken(Activation.name), useValue: mockModel },
        { provide: getModelToken(Installation.name), useValue: mockModel },
        { provide: getModelToken(ActivationToken.name), useValue: mockModel },
        { provide: getModelToken(License.name), useValue: mockModel },
        { provide: getModelToken(Product.name), useValue: mockModel },
        { provide: getModelToken(Purchase.name), useValue: mockModel },
        { provide: getModelToken(ValidationLog.name), useValue: mockModel },
        { provide: getModelToken(BlockedEntity.name), useValue: mockModel },
        { provide: getModelToken(AuditLog.name), useValue: mockModel },
        { provide: TokenService, useValue: mockTokenService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ActivationsService>(ActivationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeHealthStatus', () => {
    it('should return Revoked when activation status is revoked', () => {
      const act = { status: ActivationStatus.REVOKED, lastValidatedAt: new Date() };
      const res = service.computeHealthStatus(act, {}, {});
      expect(res.health).toBe('Revoked');
      expect(res.flagged).toBe(false);
    });

    it('should return Suspended when activation status is suspended', () => {
      const act = { status: ActivationStatus.SUSPENDED, lastValidatedAt: new Date() };
      const res = service.computeHealthStatus(act, {}, {});
      expect(res.health).toBe('Suspended');
      expect(res.flagged).toBe(false);
    });

    it('should return Healthy when last validated is recent', () => {
      const act = { status: ActivationStatus.ACTIVE, lastValidatedAt: new Date() };
      const product = { currentVersion: '1.0.0', licenseSettings: { validationIntervalHours: 24, offlineGracePeriodDays: 7 } };
      const res = service.computeHealthStatus(act, product, {});
      expect(res.health).toBe('Healthy');
      expect(res.flagged).toBe(false);
    });

    it('should return Validation Overdue when validation interval has passed but within grace period', () => {
      // 30 hours ago (validation interval is 24 hours, grace period is 7 days)
      const date = new Date(Date.now() - 30 * 3600 * 1000);
      const act = { status: ActivationStatus.ACTIVE, lastValidatedAt: date };
      const product = { currentVersion: '1.0.0', licenseSettings: { validationIntervalHours: 24, offlineGracePeriodDays: 7 } };
      const res = service.computeHealthStatus(act, product, {});
      expect(res.health).toBe('Validation Overdue');
      expect(res.flagged).toBe(true);
    });

    it('should return Offline when validation interval and grace period have passed', () => {
      // 9 days ago (validation interval is 24h + 7 days grace = 8 days total allowed offline)
      const date = new Date(Date.now() - 9 * 24 * 3600 * 1000);
      const act = { status: ActivationStatus.ACTIVE, lastValidatedAt: date };
      const product = { currentVersion: '1.0.0', licenseSettings: { validationIntervalHours: 24, offlineGracePeriodDays: 7 } };
      const res = service.computeHealthStatus(act, product, {});
      expect(res.health).toBe('Offline');
      expect(res.flagged).toBe(true);
    });

    it('should return Outdated when productVersion does not match currentVersion', () => {
      const act = { status: ActivationStatus.ACTIVE, lastValidatedAt: new Date(), productVersion: '0.9.0' };
      const product = { currentVersion: '1.0.0', licenseSettings: { validationIntervalHours: 24, offlineGracePeriodDays: 7 } };
      const res = service.computeHealthStatus(act, product, {});
      expect(res.health).toBe('Outdated');
      expect(res.isProductOutdated).toBe(true);
    });

    it('should return Outdated when sdkVersion does not match latestSdkVersion', () => {
      const act = { status: ActivationStatus.ACTIVE, lastValidatedAt: new Date(), productVersion: '1.0.0', sdkVersion: '0.8.0', sdkType: 'typescript' };
      const product = { currentVersion: '1.0.0', licenseSettings: { validationIntervalHours: 24, offlineGracePeriodDays: 7 } };
      const res = service.computeHealthStatus(act, product, {});
      expect(res.health).toBe('Outdated');
      expect(res.isSdkOutdated).toBe(true);
    });
  });
});
