import { Test, TestingModule } from '@nestjs/testing';
import { LicenseRecoveryService } from './license-recovery.service';
import { getModelToken } from '@nestjs/mongoose';
import { LicenseRecoveryRequest } from '../../database/schemas/license-recovery.schema';
import { License } from '../../database/schemas/license.schema';
import { Activation } from '../../database/schemas/activation.schema';
import { Product } from '../../database/schemas/product.schema';
import { Installation } from '../../database/schemas/installation.schema';
import { ActivationToken } from '../../database/schemas/activation-token.schema';
import { AuditLog } from '../../database/schemas/audit-log.schema';
import { Purchase } from '../../database/schemas/purchase.schema';
import { User } from '../../database/schemas/user.schema';
import { TokenService } from '../token/token.service';
import { ActivationsService } from '../activations/activations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivationStatus } from '../../common/enums/app.enums';

describe('LicenseRecoveryService', () => {
  let service: LicenseRecoveryService;

  const mockModel = {
    findOne: jest.fn(),
    find: jest.fn().mockReturnThis(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };

  const mockTokenService = {
    signActivationToken: jest.fn().mockReturnValue({ tokenId: 'tok_123', token: 'mockToken', expiresAt: new Date() }),
    hashToken: jest.fn().mockReturnValue('mockHash'),
  };

  const mockActivationsService = {
    resolveEffectiveSettings: jest.fn().mockReturnValue({
      recoveryEnabled: true,
      autoApproveRecovery: true,
      recoveryLimit: 3,
      recoveryCooldownHours: 720,
    }),
    generateActivationId: jest.fn().mockReturnValue('ACT-RECOVERY123'),
  };

  const mockNotificationsService = {
    notifyAdmins: jest.fn().mockResolvedValue(true),
    notifyCustomer: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseRecoveryService,
        { provide: getModelToken(LicenseRecoveryRequest.name), useValue: mockModel },
        { provide: getModelToken(License.name), useValue: mockModel },
        { provide: getModelToken(Activation.name), useValue: mockModel },
        { provide: getModelToken(Product.name), useValue: mockModel },
        { provide: getModelToken(Installation.name), useValue: mockModel },
        { provide: getModelToken(ActivationToken.name), useValue: mockModel },
        { provide: getModelToken(AuditLog.name), useValue: mockModel },
        { provide: getModelToken(Purchase.name), useValue: mockModel },
        { provide: getModelToken(User.name), useValue: mockModel },
        { provide: TokenService, useValue: mockTokenService },
        { provide: ActivationsService, useValue: mockActivationsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<LicenseRecoveryService>(LicenseRecoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapReasonToStatus', () => {
    it('should map lost server reason to LOST status', () => {
      const res = (service as any).mapReasonToStatus('hosting_server_lost');
      expect(res).toBe(ActivationStatus.LOST);
    });

    it('should map move script reason to REPLACED status', () => {
      const res = (service as any).mapReasonToStatus('php_script_moved');
      expect(res).toBe(ActivationStatus.REPLACED);
    });

    it('should map other reason to RECOVERED status', () => {
      const res = (service as any).mapReasonToStatus('other_custom_reason');
      expect(res).toBe(ActivationStatus.RECOVERED);
    });
  });
});
