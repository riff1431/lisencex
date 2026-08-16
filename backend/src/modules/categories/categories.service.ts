import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Category,
  CategoryDocument,
} from '../../database/schemas/category.schema';
import {
  Tag,
  TagDocument,
} from '../../database/schemas/tag.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTagDto,
  QueryCatalogDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultCategoriesAndTags();
  }

  /**
   * 1. Seed Standard Categories & Popular Tags on First Startup
   */
  async seedDefaultCategoriesAndTags() {
    try {
      const count = await this.categoryModel.countDocuments();
      if (count === 0) {
        this.logger.log('Seeding standard digital marketplace categories & tags...');

        const standardCategories = [
          { name: 'WordPress Plugins', slug: 'wordpress-plugins', icon: 'Layers', displayOrder: 1, description: 'Premium extensions & addons for WordPress and WooCommerce' },
          { name: 'WordPress Themes', slug: 'wordpress-themes', icon: 'Sparkles', displayOrder: 2, description: 'Modern responsive themes & templates for WordPress' },
          { name: 'Next.js Apps', slug: 'nextjs-apps', icon: 'Terminal', displayOrder: 3, description: 'Full-stack Next.js applications, SaaS boilers & boilerplates' },
          { name: 'Next.js Themes', slug: 'nextjs-themes', icon: 'Sparkles', displayOrder: 4, description: 'Tailwind and UI themes for Next.js and React' },
          { name: 'Next.js Plugins', slug: 'nextjs-plugins', icon: 'Code2', displayOrder: 5, description: 'Reusable components and SDK integrations for Next.js' },
          { name: 'PHP Scripts', slug: 'php-scripts', icon: 'Code2', displayOrder: 6, description: 'Standalone backend PHP scripts, APIs and web portals' },
          { name: 'SaaS Tools', slug: 'saas-tools', icon: 'Globe2', displayOrder: 7, description: 'Cloud-ready multi-tenant SaaS platforms and utilities' },
        ];

        for (const cat of standardCategories) {
          const parent = await this.categoryModel.create({
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            displayOrder: cat.displayOrder,
            description: cat.description,
            isActive: true,
            seoTitle: `${cat.name} - Download Digital Assets & Licenses`,
            metaDescription: cat.description,
          });

          // Seed subcategories for WordPress Plugins & Next.js Apps
          if (cat.slug === 'wordpress-plugins') {
            await this.categoryModel.create([
              { name: 'WooCommerce & Ecommerce', slug: 'wp-ecommerce', parentId: parent._id, parentSlug: parent.slug, displayOrder: 1, isActive: true },
              { name: 'Security & Optimization', slug: 'wp-security', parentId: parent._id, parentSlug: parent.slug, displayOrder: 2, isActive: true },
              { name: 'Marketing & SEO', slug: 'wp-marketing', parentId: parent._id, parentSlug: parent.slug, displayOrder: 3, isActive: true },
            ]);
          } else if (cat.slug === 'nextjs-apps') {
            await this.categoryModel.create([
              { name: 'SaaS Starters', slug: 'nextjs-saas-starters', parentId: parent._id, parentSlug: parent.slug, displayOrder: 1, isActive: true },
              { name: 'AI Tools & Agents', slug: 'nextjs-ai-tools', parentId: parent._id, parentSlug: parent.slug, displayOrder: 2, isActive: true },
            ]);
          }
        }

        // Seed Tags
        const standardTags = [
          { name: 'Ecommerce', slug: 'ecommerce', color: 'emerald', description: 'Storefronts, checkouts and shopping carts' },
          { name: 'AI', slug: 'ai', color: 'purple', description: 'Artificial intelligence and LLM tools' },
          { name: 'Marketing', slug: 'marketing', color: 'blue', description: 'SEO, lead capture and email campaigns' },
          { name: 'Booking', slug: 'booking', color: 'amber', description: 'Reservations, calendars and appointments' },
          { name: 'Social', slug: 'social', color: 'pink', description: 'Communities, forums and member portals' },
          { name: 'Streaming', slug: 'streaming', color: 'rose', description: 'Live video, audio and WebRTC' },
          { name: 'Utility', slug: 'utility', color: 'indigo', description: 'Developer tools, converters and scripts' },
          { name: 'Security', slug: 'security', color: 'sky', description: 'Authentication, 2FA and encryption' },
        ];

        for (const t of standardTags) {
          await this.tagModel.create({
            name: t.name,
            slug: t.slug,
            color: t.color,
            description: t.description,
            isActive: true,
          });
        }

        this.logger.log('Successfully seeded standard categories and tags.');
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed categories/tags: ${err.message}`);
    }
  }

  /**
   * 2. Recalculate Live Product Counts per Category & Tag
   */
  async recalculateProductCounts() {
    try {
      const categories = await this.categoryModel.find().lean();
      for (const cat of categories) {
        // Count products where primaryCategoryId or categoryIds matches
        const count = await this.productModel.countDocuments({
          isArchived: false,
          $or: [
            { primaryCategoryId: cat._id },
            { categoryIds: cat._id },
          ],
        });
        await this.categoryModel.updateOne({ _id: cat._id }, { productCount: count });
      }

      const tags = await this.tagModel.find().lean();
      for (const t of tags) {
        const count = await this.productModel.countDocuments({
          isArchived: false,
          tags: t.slug,
        });
        await this.tagModel.updateOne({ _id: t._id }, { productCount: count });
      }
    } catch (err: any) {
      this.logger.warn(`Error updating product counts: ${err.message}`);
    }
  }

  /**
   * 3. Get Public Hierarchical Categories Tree
   */
  async getPublicCategoriesTree() {
    const allCategories = await this.categoryModel
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const rootCategories = allCategories.filter((c) => !c.parentId);
    const subCategories = allCategories.filter((c) => !!c.parentId);

    return rootCategories.map((root) => {
      const children = subCategories.filter(
        (sub) => sub.parentId?.toString() === root._id.toString(),
      );
      const totalAggregateCount =
        root.productCount + children.reduce((sum, c) => sum + (c.productCount || 0), 0);

      return {
        ...root,
        aggregateProductCount: totalAggregateCount,
        subcategories: children,
      };
    });
  }

  /**
   * 4. Get Public Category By Slug
   */
  async getCategoryBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug: slug.toLowerCase(), isActive: true }).lean();
    if (!category) {
      throw new NotFoundException(`Category "${slug}" not found`);
    }

    const subcategories = await this.categoryModel
      .find({ parentId: category._id, isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    let parent: any = null;
    if (category.parentId) {
      parent = await this.categoryModel.findById(category.parentId).lean();
    }

    return {
      ...category,
      parent,
      subcategories,
    };
  }

  /**
   * 5. Get Public Tags
   */
  async getPublicTags() {
    return this.tagModel
      .find({ isActive: true })
      .sort({ productCount: -1, name: 1 })
      .lean();
  }

  /**
   * 6. Multi-Faceted Marketplace Catalog Filtering
   */
  async getCatalog(query: QueryCatalogDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 24);
    const skip = (page - 1) * limit;

    const filter: any = { isArchived: false };

    // Filter by Category or Subcategory
    if (query.category) {
      const catDoc = await this.categoryModel.findOne({ slug: query.category.toLowerCase() });
      if (catDoc) {
        // Also include subcategory IDs if it's a parent
        const childCats = await this.categoryModel.find({ parentId: catDoc._id }).select('_id').lean();
        const allMatchingCatIds = [catDoc._id, ...childCats.map((c) => c._id)];

        filter.$or = [
          { primaryCategoryId: { $in: allMatchingCatIds } },
          { categoryIds: { $in: allMatchingCatIds } },
        ];
      }
    }

    // Filter by Tag
    if (query.tag) {
      filter.tags = query.tag.toLowerCase();
    }

    // Filter by Product Type
    if (query.productType && query.productType !== 'all') {
      filter.productType = query.productType;
    }

    // Filter by Price Range
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }

    // Filter by Badge / Label
    if (query.badge) {
      const b = query.badge.toLowerCase();
      if (b === 'featured') filter.isFeatured = true;
      else if (b === 'popular') filter.isPopular = true;
      else if (b === 'new') filter.isNewRelease = true;
      else if (b === 'bestseller' || b === 'best_seller') filter.isBestSeller = true;
      else filter.badgeLabel = { $regex: query.badge, $options: 'i' };
    }

    // Search query
    if (query.search) {
      const s = query.search.trim();
      const regex = { $regex: s, $options: 'i' };
      const searchConditions = [
        { name: regex },
        { description: regex },
        { shortDescription: regex },
        { slug: regex },
        { tags: regex },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // Sort options
    let sortOptions: any = { createdAt: -1 };
    switch (query.sortBy) {
      case 'popularity':
        sortOptions = { salesCount: -1, isPopular: -1, viewCount: -1, createdAt: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'updated':
        sortOptions = { updatedAt: -1 };
        break;
      case 'price_asc':
        sortOptions = { price: 1 };
        break;
      case 'price_desc':
        sortOptions = { price: -1 };
        break;
      case 'best_seller':
        sortOptions = { isBestSeller: -1, salesCount: -1, createdAt: -1 };
        break;
      default:
        sortOptions = { isFeatured: -1, createdAt: -1 };
        break;
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('primaryCategoryId', 'name slug icon')
        .populate('categoryIds', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 7. Admin Category Management
   */
  async getAllAdminCategories() {
    return this.categoryModel
      .find()
      .populate('parentId', 'name slug')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
  }

  async createCategory(dto: CreateCategoryDto, actorEmail: string) {
    const slug = (dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).toLowerCase();

    const existing = await this.categoryModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(`Category slug "${slug}" already exists`);
    }

    let parentSlug: string | undefined;
    let parentObjectId: Types.ObjectId | undefined;

    if (dto.parentId) {
      const parent = await this.categoryModel.findById(dto.parentId);
      if (parent) {
        parentSlug = parent.slug;
        parentObjectId = parent._id as Types.ObjectId;
      }
    }

    const category = await this.categoryModel.create({
      name: dto.name,
      slug,
      description: dto.description,
      icon: dto.icon || 'Layers',
      thumbnailUrl: dto.thumbnailUrl,
      parentId: parentObjectId,
      parentSlug,
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
      seoTitle: dto.seoTitle,
      metaDescription: dto.metaDescription,
    });

    await this.auditLogModel.create({
      actorEmail,
      action: 'CATEGORY_CREATED',
      targetType: 'category',
      targetId: category._id.toString(),
      after: { name: category.name, slug: category.slug, parentSlug: category.parentSlug },
    });

    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, actorEmail: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const before = { ...category.toObject() };

    if (dto.name) category.name = dto.name;
    if (dto.slug) category.slug = dto.slug.toLowerCase();
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.icon !== undefined) category.icon = dto.icon;
    if (dto.thumbnailUrl !== undefined) category.thumbnailUrl = dto.thumbnailUrl;
    if (dto.displayOrder !== undefined) category.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    if (dto.seoTitle !== undefined) category.seoTitle = dto.seoTitle;
    if (dto.metaDescription !== undefined) category.metaDescription = dto.metaDescription;

    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        const parent = await this.categoryModel.findById(dto.parentId);
        if (parent) {
          category.parentId = parent._id as Types.ObjectId;
          category.parentSlug = parent.slug;
        }
      } else {
        category.parentId = undefined;
        category.parentSlug = undefined;
      }
    }

    await category.save();

    await this.auditLogModel.create({
      actorEmail,
      action: 'CATEGORY_UPDATED',
      targetType: 'category',
      targetId: category._id.toString(),
      before: { name: before.name, slug: before.slug },
      after: { name: category.name, slug: category.slug },
    });

    return category;
  }

  async deleteCategory(id: string, actorEmail: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Reparent any child categories to root
    await this.categoryModel.updateMany({ parentId: category._id }, { $set: { parentId: null, parentSlug: null } });

    await this.categoryModel.deleteOne({ _id: id });

    await this.auditLogModel.create({
      actorEmail,
      action: 'CATEGORY_DELETED',
      targetType: 'category',
      targetId: id,
      before: { name: category.name, slug: category.slug },
    });

    return { deleted: true };
  }

  /**
   * 8. Admin Tag Management
   */
  async getAllAdminTags() {
    return this.tagModel.find().sort({ productCount: -1, name: 1 }).lean();
  }

  async createTag(dto: CreateTagDto, actorEmail: string) {
    const slug = (dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).toLowerCase();

    const existing = await this.tagModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(`Tag "${slug}" already exists`);
    }

    const tag = await this.tagModel.create({
      name: dto.name,
      slug,
      description: dto.description,
      color: dto.color || 'indigo',
      isActive: dto.isActive ?? true,
    });

    await this.auditLogModel.create({
      actorEmail,
      action: 'TAG_CREATED',
      targetType: 'tag',
      targetId: tag._id.toString(),
      after: { name: tag.name, slug: tag.slug },
    });

    return tag;
  }

  async deleteTag(id: string, actorEmail: string) {
    const tag = await this.tagModel.findById(id);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.tagModel.deleteOne({ _id: id });

    await this.auditLogModel.create({
      actorEmail,
      action: 'TAG_DELETED',
      targetType: 'tag',
      targetId: id,
      before: { name: tag.name, slug: tag.slug },
    });

    return { deleted: true };
  }
}
