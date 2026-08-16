import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Review,
  ReviewDocument,
  ReviewStatus,
} from '../../database/schemas/review.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  Purchase,
  PurchaseDocument,
  PurchaseStatus,
} from '../../database/schemas/purchase.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import {
  SubmitReviewDto,
  UpdateReviewStatusDto,
  AdminReplyReviewDto,
} from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * 1. Customer Submits or Updates a Review (Enforces Verified Purchase Check)
   */
  async submitReview(userId: string, customerName: string, dto: SubmitReviewDto) {
    const product = await this.productModel.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify customer owns a valid, non-revoked purchase of this product
    const validPurchase = await this.purchaseModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: product._id,
      status: { $nin: [PurchaseStatus.REFUNDED, PurchaseStatus.DISPUTED, PurchaseStatus.CANCELLED] },
    });

    if (!validPurchase) {
      throw new BadRequestException('Only customers with a verified, active purchase of this product can submit reviews.');
    }

    const isVerifiedPurchase = true;

    // Check if user already reviewed this product -> update existing
    let review = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: product._id,
    });

    if (review) {
      review.rating = dto.rating;
      review.title = dto.title;
      review.comment = dto.comment;
      if (dto.screenshots) review.screenshots = dto.screenshots;
      if (dto.productVersion) review.productVersion = dto.productVersion;
      review.isVerifiedPurchase = isVerifiedPurchase;
      if (validPurchase) review.purchaseId = validPurchase._id as Types.ObjectId;
      await review.save();
    } else {
      review = await this.reviewModel.create({
        productId: product._id,
        userId: new Types.ObjectId(userId),
        purchaseId: validPurchase?._id,
        customerName: customerName || 'Verified Buyer',
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        screenshots: dto.screenshots || [],
        productVersion: dto.productVersion || product.currentVersion || '1.0.0',
        isVerifiedPurchase,
        marketplaceSource: validPurchase?.source || 'own_marketplace',
        status: ReviewStatus.APPROVED, // Auto-approve or moderate
      });
    }

    // Recalculate product aggregate ratings
    await this.recalculateProductRating(product._id.toString());

    await this.auditLogModel.create({
      actorEmail: customerName,
      action: 'PRODUCT_REVIEW_SUBMITTED',
      targetType: 'review',
      targetId: review._id.toString(),
      after: { productId: product._id.toString(), rating: dto.rating, isVerifiedPurchase },
    });

    return review;
  }

  /**
   * 2. Recalculate Product Average Rating and Counts
   */
  async recalculateProductRating(productId: string) {
    const approvedReviews = await this.reviewModel
      .find({
        productId: new Types.ObjectId(productId),
        status: ReviewStatus.APPROVED,
      })
      .lean();

    const totalReviews = approvedReviews.length;
    let averageRating = 5.0;

    if (totalReviews > 0) {
      const sum = approvedReviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = Math.round((sum / totalReviews) * 10) / 10;
    }

    await this.productModel.updateOne(
      { _id: new Types.ObjectId(productId) },
      { averageRating, totalReviews },
    );
  }

  /**
   * 3. Get Public Reviews for a Product (with rating distribution)
   */
  async getProductReviews(slugOrId: string) {
    const product = await this.productModel.findOne({
      $or: [
        { slug: slugOrId.toLowerCase() },
        { _id: Types.ObjectId.isValid(slugOrId) ? new Types.ObjectId(slugOrId) : null },
      ],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const reviews = await this.reviewModel
      .find({
        productId: product._id,
        status: ReviewStatus.APPROVED,
      })
      .sort({ createdAt: -1 })
      .lean();

    // Compute star distribution breakdown
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const stars = Math.min(5, Math.max(1, Math.floor(r.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[stars] = (distribution[stars] || 0) + 1;
    });

    return {
      averageRating: product.averageRating || 5.0,
      totalReviews: reviews.length,
      distribution,
      reviews,
    };
  }

  /**
   * 4. Get Customer's Own Reviews
   */
  async getCustomerReviews(userId: string) {
    return this.reviewModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('productId', 'name slug thumbnailUrl iconUrl')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * 5. Admin: Get All Reviews with Filters
   */
  async getAllAdminReviews(query?: { status?: string; productId?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.productId) filter.productId = new Types.ObjectId(query.productId);
    if (query?.search) {
      filter.$or = [
        { customerName: { $regex: query.search, $options: 'i' } },
        { title: { $regex: query.search, $options: 'i' } },
        { comment: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('productId', 'name slug')
        .populate('userId', 'email name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reviewModel.countDocuments(filter),
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
   * 6. Admin: Update Review Status (Moderate)
   */
  async updateReviewStatus(id: string, dto: UpdateReviewStatusDto, actorEmail: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.status = dto.status;
    await review.save();

    // Recalculate product rating
    await this.recalculateProductRating(review.productId.toString());

    await this.auditLogModel.create({
      actorEmail,
      action: 'REVIEW_STATUS_UPDATED',
      targetType: 'review',
      targetId: review._id.toString(),
      after: { status: dto.status },
    });

    return review;
  }

  /**
   * 7. Admin: Reply to Review
   */
  async replyToReview(id: string, dto: AdminReplyReviewDto, actorEmail: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.adminReply = dto.reply;
    review.adminRepliedAt = new Date();
    review.adminRepliedBy = actorEmail;
    await review.save();

    await this.auditLogModel.create({
      actorEmail,
      action: 'REVIEW_REPLY_POSTED',
      targetType: 'review',
      targetId: review._id.toString(),
      after: { reply: dto.reply },
    });

    return review;
  }
}
