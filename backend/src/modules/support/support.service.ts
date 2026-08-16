import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import {
  Ticket,
  TicketDocument,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  SenderRole,
} from '../../database/schemas/ticket.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  Purchase,
  PurchaseDocument,
} from '../../database/schemas/purchase.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import {
  User,
  UserDocument,
} from '../../database/schemas/user.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import {
  Notification,
  NotificationDocument,
} from '../../database/schemas/notification.schema';
import {
  CreateTicketDto,
  ReplyTicketDto,
  AssignTicketDto,
  UpdateTicketStatusDto,
  RateTicketDto,
  QueryTicketsDto,
} from './dto/ticket.dto';
import {
  MarketplaceProviderType,
  NotificationType,
  NotificationSeverity,
  NotificationRecipientType,
  ActivationStatus,
  LicenseStatus,
} from '../../common/enums/app.enums';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name) private activationModel: Model<ActivationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  generateTicketNumber(): string {
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `TCK-${ts}-${rand}`;
  }

  /**
   * 1. Get Customer Context for dynamic ticket creation (owned products, purchases, licenses, domains)
   */
  async getCustomerContext(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const [purchases, licenses, activations] = await Promise.all([
      this.purchaseModel.find({ userId: userObjectId }).populate('productId').lean(),
      this.licenseModel.find({ userId: userObjectId }).populate('productId').lean(),
      this.activationModel.find({ userId: userObjectId, status: ActivationStatus.ACTIVE }).lean(),
    ]);

    // Group items for easy dropdown consumption
    const productsMap = new Map<string, any>();

    for (const lic of licenses) {
      const prod = lic.productId as any;
      if (!prod) continue;
      const prodId = prod._id.toString();

      if (!productsMap.has(prodId)) {
        productsMap.set(prodId, {
          productId: prodId,
          productName: prod.name,
          productSlug: prod.slug,
          productType: prod.productType,
          licenses: [],
        });
      }

      const matchingActivations = activations.filter(
        (a) => a.licenseId && a.licenseId.toString() === lic._id.toString(),
      );

      productsMap.get(prodId).licenses.push({
        licenseId: lic._id.toString(),
        licenseKey: lic.licenseKey,
        licenseStatus: lic.status,
        supportExpiryDate: lic.supportExpiresAt,
        isSupportActive: !lic.supportExpiresAt || new Date() <= new Date(lic.supportExpiresAt),
        activations: matchingActivations.map((a) => ({
          activationId: a._id.toString(),
          domain: a.domain || a.installationUrl || a.ip || 'Active Instance',
          installedVersion: a.productVersion,
        })),
      });
    }

    return {
      products: Array.from(productsMap.values()),
      totalLicenses: licenses.length,
      totalActiveInstallations: activations.length,
    };
  }

  /**
   * 2. Create Support Ticket (Validates Product/License ownership unless Pre-Sale/General)
   */
  async createTicket(userId: string, dto: CreateTicketDto, userEmail: string, userName: string) {
    const userObjectId = new Types.ObjectId(userId);

    const isGeneralOrPreSale =
      dto.category === TicketCategory.PRE_SALE ||
      dto.category === TicketCategory.GENERAL_INQUIRY ||
      dto.category === TicketCategory.BILLING_REFUND;

    let productDoc: ProductDocument | null = null;
    let purchaseDoc: PurchaseDocument | null = null;
    let licenseDoc: LicenseDocument | null = null;
    let activationDoc: ActivationDocument | null = null;
    let marketplaceSource = MarketplaceProviderType.INTERNAL;
    let supportExpiryDate: Date | undefined;
    let isSupportActive = true;

    if (dto.productId) {
      productDoc = await this.productModel.findById(dto.productId);
      if (!productDoc) {
        throw new NotFoundException('Selected product not found');
      }
    }

    if (dto.licenseId) {
      licenseDoc = await this.licenseModel.findById(dto.licenseId);
      if (!licenseDoc || licenseDoc.userId.toString() !== userId) {
        throw new ForbiddenException('You do not own the selected license');
      }
      if (!productDoc && licenseDoc.productId) {
        productDoc = await this.productModel.findById(licenseDoc.productId);
      }
      supportExpiryDate = licenseDoc.supportExpiresAt;
      if (supportExpiryDate && new Date() > new Date(supportExpiryDate)) {
        isSupportActive = false;
      }
    }

    if (dto.purchaseId) {
      purchaseDoc = await this.purchaseModel.findById(dto.purchaseId);
      if (purchaseDoc) {
        marketplaceSource = purchaseDoc.source || MarketplaceProviderType.INTERNAL;
        if (purchaseDoc.supportExpiresAt) {
          supportExpiryDate = purchaseDoc.supportExpiresAt;
          if (new Date() > new Date(supportExpiryDate)) {
            isSupportActive = false;
          }
        }
      }
    }

    if (dto.activationId) {
      activationDoc = await this.activationModel.findById(dto.activationId);
    }

    // If technical issue or bug report and not general, ensure product is chosen
    if (!isGeneralOrPreSale && !productDoc && !licenseDoc) {
      throw new BadRequestException('A purchased product or license is required for technical support tickets');
    }

    const ticketNumber = this.generateTicketNumber();

    const initialMessage = {
      senderId: userObjectId,
      senderName: userName || userEmail,
      senderEmail: userEmail,
      senderRole: SenderRole.CUSTOMER,
      message: dto.message,
      attachments: dto.attachments || [],
      isInternalNote: false,
      createdAt: new Date(),
    };

    const ticket = await this.ticketModel.create({
      ticketNumber,
      userId: userObjectId,
      customerName: userName || userEmail,
      customerEmail: userEmail,
      productId: productDoc?._id,
      productName: productDoc?.name,
      productSlug: productDoc?.slug,
      purchaseId: purchaseDoc?._id || licenseDoc?.purchaseId,
      purchaseKey: purchaseDoc?.purchaseKey,
      marketplaceSource,
      licenseId: licenseDoc?._id,
      licenseKey: licenseDoc?.licenseKey,
      licenseStatus: licenseDoc?.status,
      activationId: activationDoc?._id,
      domain: activationDoc?.domain || dto.domain,
      category: dto.category,
      priority: dto.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      subject: dto.subject,
      messages: [initialMessage],
      supportExpiryDate,
      isSupportActive,
      lastRepliedAt: new Date(),
      lastRepliedByRole: SenderRole.CUSTOMER,
    });

    // Audit Log
    await this.auditLogModel.create({
      actorEmail: userEmail,
      action: 'TICKET_CREATED',
      targetType: 'ticket',
      targetId: ticket._id.toString(),
      after: {
        ticketNumber: ticket.ticketNumber,
        category: ticket.category,
        priority: ticket.priority,
        productName: ticket.productName,
      },
    });

    // Notify Admins
    await this.notificationModel.create({
      recipientType: NotificationRecipientType.ADMIN,
      type: NotificationType.SUSPICIOUS_ACTIVITY,
      severity: NotificationSeverity.INFO,
      title: `New Support Ticket #${ticket.ticketNumber}`,
      message: `${userName || userEmail} opened a new ticket: "${ticket.subject}"`,
      data: { ticketId: ticket._id.toString(), ticketNumber: ticket.ticketNumber },
    });

    return ticket;
  }

  /**
   * 3. Reply to Ticket / Add Internal Note
   */
  async replyTicket(
    ticketId: string,
    userId: string,
    userEmail: string,
    userName: string,
    userRole: string,
    dto: ReplyTicketDto,
  ) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isStaff = userRole === 'admin' || userRole === 'super_admin';

    // Access Check
    if (!isStaff && ticket.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to view or reply to this ticket');
    }

    // Only staff can post internal notes
    const isInternal = isStaff && !!dto.isInternalNote;

    const senderRole = isStaff ? SenderRole.ADMIN : SenderRole.CUSTOMER;

    const newMessage = {
      senderId: new Types.ObjectId(userId),
      senderName: userName || userEmail,
      senderEmail: userEmail,
      senderRole,
      message: dto.message,
      attachments: dto.attachments || [],
      isInternalNote: isInternal,
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage as any);

    // Update ticket metadata if it's a public reply
    if (!isInternal) {
      ticket.lastRepliedAt = new Date();
      ticket.lastRepliedByRole = senderRole;

      if (!isStaff) {
        // Customer replied -> set status to in_progress or open
        if (ticket.status === TicketStatus.WAITING_CUSTOMER || ticket.status === TicketStatus.RESOLVED) {
          ticket.status = TicketStatus.IN_PROGRESS;
        }
      } else {
        // Staff replied -> set to waiting_customer unless explicitly specified
        ticket.status = dto.statusTransition || TicketStatus.WAITING_CUSTOMER;
      }
    }

    if (dto.statusTransition && isStaff) {
      ticket.status = dto.statusTransition;
      if (dto.statusTransition === TicketStatus.RESOLVED) {
        ticket.resolvedAt = new Date();
      } else if (dto.statusTransition === TicketStatus.CLOSED) {
        ticket.closedAt = new Date();
      }
    }

    await ticket.save();

    // Audit Log
    await this.auditLogModel.create({
      actorEmail: userEmail,
      action: isInternal ? 'TICKET_INTERNAL_NOTE_ADDED' : 'TICKET_REPLIED',
      targetType: 'ticket',
      targetId: ticket._id.toString(),
      after: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        senderRole,
        isInternalNote: isInternal,
      },
    });

    // Notifications
    if (!isInternal) {
      if (isStaff) {
        // Notify Customer of agent reply
        await this.notificationModel.create({
          recipientType: NotificationRecipientType.CUSTOMER,
          recipientId: ticket.userId,
          recipientEmail: ticket.customerEmail,
          type: NotificationType.SUPPORT_EXPIRING_SOON,
          severity: NotificationSeverity.INFO,
          title: `Reply on Ticket #${ticket.ticketNumber}`,
          message: `Support Agent replied: "${dto.message.slice(0, 120)}..."`,
          data: { ticketId: ticket._id.toString(), ticketNumber: ticket.ticketNumber },
        });
      } else {
        // Notify Staff of customer reply
        if (ticket.assignedAgentEmail) {
          await this.notificationModel.create({
            recipientType: NotificationRecipientType.ADMIN,
            type: NotificationType.SYSTEM_ALERT,
            severity: NotificationSeverity.INFO,
            title: `Customer Replied on #${ticket.ticketNumber}`,
            message: `${userName || userEmail} added a reply to ticket "${ticket.subject}"`,
            data: { ticketId: ticket._id.toString() },
          });
        }
      }
    }

    return ticket;
  }

  /**
   * 4. Assign Support Agent
   */
  async assignTicket(ticketId: string, dto: AssignTicketDto, actorEmail: string) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const agent = await this.userModel.findById(dto.agentId);
    if (!agent) {
      throw new NotFoundException('Support agent not found');
    }

    const before = { assignedAgentId: ticket.assignedAgentId, assignedAgentName: ticket.assignedAgentName };

    ticket.assignedAgentId = agent._id as Types.ObjectId;
    ticket.assignedAgentName = agent.fullName || agent.email;
    ticket.assignedAgentEmail = agent.email;
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }
    await ticket.save();

    await this.auditLogModel.create({
      actorEmail,
      action: 'TICKET_ASSIGNED',
      targetType: 'ticket',
      targetId: ticket._id.toString(),
      before,
      after: {
        assignedAgentId: agent._id.toString(),
        assignedAgentName: ticket.assignedAgentName,
        assignedAgentEmail: ticket.assignedAgentEmail,
      },
    });

    // Notify assigned agent
    await this.notificationModel.create({
      recipientType: NotificationRecipientType.ADMIN,
      recipientId: agent._id,
      recipientEmail: agent.email,
      type: NotificationType.SYSTEM_ALERT,
      severity: NotificationSeverity.INFO,
      title: `Ticket Assigned: #${ticket.ticketNumber}`,
      message: `You were assigned to support ticket "${ticket.subject}" by ${actorEmail}`,
      data: { ticketId: ticket._id.toString() },
    });

    return ticket;
  }

  /**
   * 5. Update Ticket Status
   */
  async updateStatus(ticketId: string, dto: UpdateTicketStatusDto, actorEmail: string) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const beforeStatus = ticket.status;
    ticket.status = dto.status;

    if (dto.status === TicketStatus.RESOLVED) {
      ticket.resolvedAt = new Date();
      if (dto.resolutionSummary) {
        ticket.resolutionSummary = dto.resolutionSummary;
      }
    } else if (dto.status === TicketStatus.CLOSED) {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    await this.auditLogModel.create({
      actorEmail,
      action: 'TICKET_STATUS_CHANGED',
      targetType: 'ticket',
      targetId: ticket._id.toString(),
      before: { status: beforeStatus },
      after: { status: ticket.status, resolutionSummary: ticket.resolutionSummary },
    });

    // Notify customer
    await this.notificationModel.create({
      recipientType: NotificationRecipientType.CUSTOMER,
      recipientId: ticket.userId,
      recipientEmail: ticket.customerEmail,
      type: NotificationType.SUPPORT_EXPIRING_SOON,
      severity: NotificationSeverity.INFO,
      title: `Ticket #${ticket.ticketNumber} is ${ticket.status.toUpperCase()}`,
      message: `The status of your ticket "${ticket.subject}" was updated to ${ticket.status}.`,
      data: { ticketId: ticket._id.toString() },
    });

    return ticket;
  }

  /**
   * 6. Get Ticket Detail with Permission-Aware Filtering (Internal Notes Hidden from Customer)
   */
  async getTicketById(ticketId: string, userId: string, userRole: string) {
    const ticket = await this.ticketModel.findById(ticketId).lean();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isStaff = userRole === 'admin' || userRole === 'super_admin';

    if (!isStaff && ticket.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!isStaff) {
      // Filter out internal notes
      ticket.messages = ticket.messages.filter((m) => !m.isInternalNote);
    }

    return ticket;
  }

  /**
   * 7. Live License Verification Stream for Support Staff
   */
  async getVerificationContext(ticketId: string) {
    const ticket = await this.ticketModel.findById(ticketId).lean();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    let licenseData: any = null;
    let activations: any[] = [];
    let productData: any = null;
    let purchaseData: any = null;

    if (ticket.licenseId) {
      licenseData = await this.licenseModel.findById(ticket.licenseId).lean();
      activations = await this.activationModel
        .find({ licenseId: ticket.licenseId })
        .sort({ lastValidatedAt: -1 })
        .limit(10)
        .lean();
    }

    if (ticket.productId) {
      productData = await this.productModel.findById(ticket.productId).select('name slug productType currentVersion isArchived isKillSwitchActive').lean();
    }

    if (ticket.purchaseId) {
      purchaseData = await this.purchaseModel.findById(ticket.purchaseId).lean();
    }

    const now = new Date();
    const supportExpiry = ticket.supportExpiryDate || licenseData?.supportExpiresAt;
    const isSupportActive = !supportExpiry || new Date(supportExpiry) >= now;
    const daysRemaining = supportExpiry ? Math.round((new Date(supportExpiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      ticketNumber: ticket.ticketNumber,
      customer: {
        userId: ticket.userId,
        name: ticket.customerName,
        email: ticket.customerEmail,
      },
      product: productData,
      license: licenseData
        ? {
            id: licenseData._id,
            licenseKey: licenseData.licenseKey,
            status: licenseData.status,
            type: licenseData.type,
            activationLimit: licenseData.activationLimit,
            activeCount: activations.filter((a) => a.status === ActivationStatus.ACTIVE).length,
            isCriticalRevoked: licenseData.isCriticalRevoked,
            expiresAt: licenseData.expiresAt,
            supportExpiryDate: licenseData.supportExpiresAt,
          }
        : null,
      activations: activations.map((a) => ({
        id: a._id,
        domain: a.domain,
        ipAddress: a.ip,
        status: a.status,
        clientVersion: a.productVersion,
        lastHeartbeat: a.lastValidatedAt,
        firstActivatedAt: a.activatedAt,
      })),
      support: {
        isSupportActive,
        supportExpiryDate: supportExpiry,
        daysRemaining,
      },
      marketplace: {
        source: ticket.marketplaceSource,
        purchaseKey: purchaseData?.purchaseKey || ticket.purchaseKey,
        buyerUsername: purchaseData?.buyerUsername,
      },
    };
  }

  /**
   * 8. Rate Support Ticket
   */
  async rateTicket(ticketId: string, userId: string, dto: RateTicketDto) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }

    ticket.rating = {
      rating: dto.rating,
      feedback: dto.feedback,
      ratedAt: new Date(),
    };

    await ticket.save();

    await this.auditLogModel.create({
      actorEmail: ticket.customerEmail,
      action: 'TICKET_RATED',
      targetType: 'ticket',
      targetId: ticket._id.toString(),
      after: { rating: dto.rating, feedback: dto.feedback },
    });

    return ticket;
  }

  /**
   * 9. Query Customer Tickets
   */
  async getCustomerTickets(userId: string, query: QueryTicketsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = { userId: new Types.ObjectId(userId) };

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;

    if (query.search) {
      filter.$or = [
        { ticketNumber: { $regex: query.search, $options: 'i' } },
        { subject: { $regex: query.search, $options: 'i' } },
        { productName: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.ticketModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      this.ticketModel.countDocuments(filter),
    ]);

    // Strip internal notes from message list summaries
    const sanitizedItems = items.map((t) => ({
      ...t,
      messagesCount: t.messages?.filter((m) => !m.isInternalNote).length || 0,
      messages: undefined,
    }));

    return {
      items: sanitizedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 10. Query Admin Tickets (with Multi-attribute Filtering)
   */
  async getAdminTickets(query: QueryTicketsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;
    if (query.productId) filter.productId = new Types.ObjectId(query.productId);
    if (query.marketplaceSource) filter.marketplaceSource = query.marketplaceSource;
    if (query.assignedAgentId) filter.assignedAgentId = new Types.ObjectId(query.assignedAgentId);

    if (query.search) {
      filter.$or = [
        { ticketNumber: { $regex: query.search, $options: 'i' } },
        { subject: { $regex: query.search, $options: 'i' } },
        { customerName: { $regex: query.search, $options: 'i' } },
        { customerEmail: { $regex: query.search, $options: 'i' } },
        { licenseKey: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.ticketModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      this.ticketModel.countDocuments(filter),
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
   * 11. Support Telemetry & KPIs
   */
  async getSupportStats() {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      waitingCustomerTickets,
      resolvedTickets,
      closedTickets,
      ratingsAgg,
    ] = await Promise.all([
      this.ticketModel.countDocuments(),
      this.ticketModel.countDocuments({ status: TicketStatus.OPEN }),
      this.ticketModel.countDocuments({ status: TicketStatus.IN_PROGRESS }),
      this.ticketModel.countDocuments({ status: TicketStatus.WAITING_CUSTOMER }),
      this.ticketModel.countDocuments({ status: TicketStatus.RESOLVED }),
      this.ticketModel.countDocuments({ status: TicketStatus.CLOSED }),
      this.ticketModel.aggregate([
        { $match: { 'rating.rating': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating.rating' },
            ratedCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      waitingCustomerTickets,
      resolvedTickets,
      closedTickets,
      averageRating: Math.round((ratingsAgg[0]?.avgRating || 5.0) * 10) / 10,
      totalRatings: ratingsAgg[0]?.ratedCount || 0,
    };
  }
}
