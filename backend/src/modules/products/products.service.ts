import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  ProductVersion,
  ProductVersionDocument,
} from '../../database/schemas/product-version.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVersionDto,
} from './dto/product.dto';
import { ProductStatus, ActivationStatus } from '../../common/enums/app.enums';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductVersion.name)
    private versionModel: Model<ProductVersionDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
  ) {}

  async create(createDto: CreateProductDto) {
    const slug = createDto.slug.toLowerCase().trim();
    const existing = await this.productModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(`Product slug "${slug}" already exists`);
    }

    const product = await this.productModel.create({
      ...createDto,
      slug,
      currentVersion: createDto.currentVersion || '1.0.0',
      latestStableVersion: createDto.currentVersion || '1.0.0',
    });

    await this.versionModel.create({
      productId: (product as any)._id,
      version: (product as any).currentVersion || '1.0.0',
      releaseName: 'Initial Release',
      releaseNotes: 'First release of product.',
      isPublic: true,
      publishedAt: new Date(),
    });

    return product;
  }

  async findAll(query?: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = { isArchived: false };
    if (query?.status) {
      filter.status = query.status;
    }
    if (query?.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { slug: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    const enriched = await Promise.all(
      items.map(async (prod) => {
        const [totalLicenses, activeActivations] = await Promise.all([
          this.licenseModel.countDocuments({ productId: prod._id }),
          this.activationModel.countDocuments({
            productId: prod._id,
            status: ActivationStatus.ACTIVE,
          }),
        ]);
        return {
          ...prod,
          totalLicenses,
          activeActivations,
        };
      }),
    );

    return {
      items: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid product ID');
    }
    const product = await this.productModel.findById(id).lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const [totalLicenses, activeActivations, versions] = await Promise.all([
      this.licenseModel.countDocuments({ productId: product._id }),
      this.activationModel.countDocuments({
        productId: product._id,
        status: ActivationStatus.ACTIVE,
      }),
      this.versionModel.find({ productId: product._id }).sort({ publishedAt: -1 }).lean(),
    ]);

    return {
      ...product,
      totalLicenses,
      activeActivations,
      versions,
    };
  }

  async findBySlug(slug: string) {
    const product = await this.productModel
      .findOne({ slug: slug.toLowerCase().trim(), isArchived: false })
      .lean();
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return product;
  }

  async update(id: string, updateDto: Partial<UpdateProductDto>) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid product ID');
    }

    if (updateDto.slug) {
      updateDto.slug = updateDto.slug.toLowerCase().trim();
      const existing = await this.productModel.findOne({
        slug: updateDto.slug,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException(`Slug "${updateDto.slug}" is already in use`);
      }
    }

    const updated = await this.productModel.findByIdAndUpdate(
      id,
      { $set: updateDto },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Product not found');
    }
    return updated;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid product ID');
    }
    const updated = await this.productModel.findByIdAndUpdate(
      id,
      { $set: { isArchived: true, status: ProductStatus.ARCHIVED } },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Product not found');
    }
    return { success: true, message: 'Product archived successfully' };
  }

  async addVersion(productId: string, versionDto: CreateProductVersionDto) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.versionModel.findOne({
      productId: product._id,
      version: versionDto.version,
    });
    if (existing) {
      throw new ConflictException(
        `Version ${versionDto.version} already exists for this product`,
      );
    }

    const version = await this.versionModel.create({
      ...versionDto,
      productId: product._id,
      publishedAt: new Date(),
    });

    product.currentVersion = versionDto.version;
    product.latestStableVersion = versionDto.version;
    await product.save();

    return version;
  }

  async getVersions(productId: string) {
    return this.versionModel
      .find({ productId })
      .sort({ publishedAt: -1 })
      .lean();
  }

  async getLatestVersion(productId: string) {
    return this.versionModel
      .findOne({ productId, isPublic: true })
      .sort({ publishedAt: -1 })
      .lean();
  }
}
