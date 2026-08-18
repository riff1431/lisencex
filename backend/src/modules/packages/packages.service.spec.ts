import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PackagesService } from './packages.service';
import { ProductVersion } from '../../database/schemas/product-version.schema';
import { Product } from '../../database/schemas/product.schema';
import { DownloadLog } from '../../database/schemas/download-log.schema';
import { License } from '../../database/schemas/license.schema';
import { Activation } from '../../database/schemas/activation.schema';
import { TokenService } from '../token/token.service';
import { StorageService } from '../storage/storage.service';
import { ZipPackageValidator } from '../../common/utils/zip-validator.util';
import { LicenseStatus } from '../../common/enums/app.enums';

const storageServiceStub = {
  getActiveProvider: jest.fn().mockResolvedValue({ type: 'local', provider: {}, config: {} }),
  putPrivateObject: jest.fn(),
  getProviderInstance: jest.fn().mockReturnValue({
    delete: jest.fn().mockResolvedValue(true),
    getSignedUrl: jest.fn().mockResolvedValue('http://signed-url'),
  }),
};

/**
 * Regression tests for the license gate on the customer download-token flow.
 * The endpoint used to stream any paid package to any authenticated user.
 */
// Valid 24-char hex ObjectIds (bson rejects anything else)
const IDS = {
    product: '507f1f77bcf86cd799439011',
    version: '507f1f77bcf86cd799439012',
    license: '507f1f77bcf86cd799439013',
    user: '507f1f77bcf86cd799439014',
};


describe('PackagesService.generateDownloadToken (license gate)', () => {
  let service: PackagesService;

  const product = {
    _id: IDS.product,
    name: 'Test Product',
    licenseSettings: {},
    licenseSettingsOverrides: {},
  };

  const version = {
    _id: IDS.version,
    version: '1.0.3',
    storagePath: '/storage/packages/test.zip',
    downloadsEnabled: true,
  };

  const activeLicense = {
    _id: IDS.license,
    status: LicenseStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    licensePlanId: null,
  };

  const mockLicenseModel = { findOne: jest.fn() };
  const mockProductModel = { findById: jest.fn() };
  const mockVersionModel = { findOne: jest.fn() };

  const licenseResolves = (license: any) =>
    mockLicenseModel.findOne.mockReturnValue({
      populate: () => Promise.resolve(license),
    });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        { provide: getModelToken(ProductVersion.name), useValue: mockVersionModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(DownloadLog.name), useValue: {} },
        { provide: getModelToken(License.name), useValue: mockLicenseModel },
        { provide: getModelToken(Activation.name), useValue: {} },
        { provide: TokenService, useValue: {} },
        { provide: StorageService, useValue: storageServiceStub },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();

    service = module.get<PackagesService>(PackagesService);
  });

  it('rejects unauthenticated callers', async () => {
    await expect(
      service.generateDownloadToken(IDS.product, IDS.version, undefined),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects callers without a license for the product', async () => {
    mockProductModel.findById.mockResolvedValue(product);
    licenseResolves(null);

    await expect(
      service.generateDownloadToken(IDS.product, IDS.version, IDS.user),
    ).rejects.toThrow('You do not have an active or valid license');
  });

  it('excludes sandbox licenses from the lookup', async () => {
    mockProductModel.findById.mockResolvedValue(product);
    licenseResolves(null);

    await expect(
      service.generateDownloadToken(IDS.product, IDS.version, IDS.user),
    ).rejects.toThrow(ForbiddenException);

    const query = mockLicenseModel.findOne.mock.calls[0][0];
    expect(query.isSandbox).toEqual({ $ne: true });
    expect(String(query.productId)).toBe(String(product._id));
  });

  it('rejects expired licenses unless blockDownloadsOnExpiry is disabled', async () => {
    mockProductModel.findById.mockResolvedValue(product);
    licenseResolves({
      ...activeLicense,
      status: LicenseStatus.EXPIRED,
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
    });

    await expect(
      service.generateDownloadToken(IDS.product, IDS.version, IDS.user),
    ).rejects.toThrow('license has expired');

    // With blockDownloadsOnExpiry: false the download must go through
    licenseResolves({
      ...activeLicense,
      status: LicenseStatus.EXPIRED,
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
    });
    mockProductModel.findById.mockResolvedValue({
      ...product,
      licenseSettings: { blockDownloadsOnExpiry: false },
    });
    mockVersionModel.findOne.mockResolvedValue(version);

    const result = await service.generateDownloadToken(IDS.product, IDS.version, IDS.user);
    expect(result.token).toBeDefined();
    expect(result.version).toBe(version.version);
  });

  it('rejects when downloads are disabled for the license plan', async () => {
    mockProductModel.findById.mockResolvedValue({
      ...product,
      licenseSettings: { downloadsEnabled: false },
    });
    licenseResolves(activeLicense);

    await expect(
      service.generateDownloadToken(IDS.product, IDS.version, IDS.user),
    ).rejects.toThrow('downloads are disabled');
  });

  it('issues a signed token bound to the verified license for valid callers', async () => {
    mockProductModel.findById.mockResolvedValue(product);
    licenseResolves(activeLicense);
    mockVersionModel.findOne.mockResolvedValue(version);

    const result = await service.generateDownloadToken(IDS.product, IDS.version, IDS.user);

    expect(result.token).toMatch(/\./); // <body>.<hmac-signature>
    expect(result.downloadUrl).toContain(result.token);
    expect(result.expiresInSeconds).toBe(900);

    const body = JSON.parse(
      Buffer.from(result.token.split('.')[0], 'base64url').toString('utf-8'),
    );
    expect(body.licenseId).toBe(String(activeLicense._id));
    expect(body.userId).toBe(IDS.user);
  });
});

/**
 * Artifact persistence: package ZIPs must land in object storage when a
 * provider is active (so they survive container rebuilds) and keep the
 * legacy local path otherwise.
 */
describe('PackagesService.uploadPackage (storage routing)', () => {
  let service: PackagesService;
  let tempFile: string;

  const mockVersionCreate = jest.fn().mockResolvedValue({ _id: 'v1' });
  const mockProductFind = jest.fn().mockResolvedValue({
    _id: IDS.product,
    slug: 'test-product',
    productType: 'wordpress_plugin',
  });

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        { provide: getModelToken(ProductVersion.name), useValue: { findOne: jest.fn().mockResolvedValue(null), create: mockVersionCreate, findByIdAndUpdate: jest.fn() } },
        { provide: getModelToken(Product.name), useValue: { findById: mockProductFind, findByIdAndUpdate: jest.fn() } },
        { provide: getModelToken(DownloadLog.name), useValue: {} },
        { provide: getModelToken(License.name), useValue: {} },
        { provide: getModelToken(Activation.name), useValue: {} },
        { provide: TokenService, useValue: {} },
        { provide: StorageService, useValue: storageServiceStub },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();
    return module.get<PackagesService>(PackagesService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tempFile = path.join(os.tmpdir(), `lx-pkg-${Date.now()}.zip`);
    fs.writeFileSync(tempFile, Buffer.from('PK-fake-zip-content'));
    jest.spyOn(ZipPackageValidator, 'validate').mockResolvedValue({ valid: true, errors: [], warnings: [], entries: ['a.php'] } as any);
    jest.spyOn(ZipPackageValidator, 'computeChecksum').mockResolvedValue('deadbeef' as any);
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    jest.restoreAllMocks();
  });

  it('stores the artifact in object storage when a provider is active', async () => {
    storageServiceStub.getActiveProvider.mockResolvedValue({ type: 'minio', provider: {}, config: {} });
    storageServiceStub.putPrivateObject.mockResolvedValue({ key: 'packages/x/y.zip', sizeBytes: 18 });
    service = await buildService();

    await service.uploadPackage(IDS.product, {
      path: tempFile, originalname: 'p.zip', size: 18, mimetype: 'application/zip',
    } as any, { version: '2.0.0' });

    expect(storageServiceStub.putPrivateObject).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(new RegExp('^packages/' + IDS.product + '/test-product-2\\.0\\.0-\\d+\\.zip$')),
      'application/zip',
    );
    expect(mockVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ storageMode: 'object', storageProvider: 'minio' }),
    );
  });

  it('falls back to the local directory when storage provider is LOCAL', async () => {
    storageServiceStub.getActiveProvider.mockResolvedValue({ type: 'local', provider: {}, config: {} });
    service = await buildService();

    await service.uploadPackage(IDS.product, {
      path: tempFile, originalname: 'p.zip', size: 18, mimetype: 'application/zip',
    } as any, { version: '2.0.1' });

    expect(storageServiceStub.putPrivateObject).not.toHaveBeenCalled();
    expect(mockVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ storageMode: 'local' }),
    );
  });
});
