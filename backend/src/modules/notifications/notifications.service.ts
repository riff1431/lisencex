import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Notification,
  NotificationDocument,
} from '../../database/schemas/notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from '../../database/schemas/notification-preference.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  User,
  UserDocument,
} from '../../database/schemas/user.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  NotificationType,
  NotificationSeverity,
  NotificationChannel,
  NotificationRecipientType,
  LicenseStatus,
  UserRole,
} from '../../common/enums/app.enums';

export interface SendNotificationDto {
  recipientType: NotificationRecipientType;
  recipientId?: string;
  recipientEmail?: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  data?: Record<string, any>;
  dedupKey?: string;
  actionUrl?: string;
  forceEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreference.name)
    private preferenceModel: Model<NotificationPreferenceDocument>,
    @InjectModel(License.name)
    private licenseModel: Model<LicenseDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  // ─── Create & Dispatch Notification ────────────────────────────────────

  async send(dto: SendNotificationDto): Promise<NotificationDocument | null> {
    const severity = dto.severity || NotificationSeverity.INFO;

    // 1. Check Deduplication
    if (dto.dedupKey) {
      const existing = await this.notificationModel.findOne({ dedupKey: dto.dedupKey });
      if (existing) {
        this.logger.debug(`Notification deduplicated for key: ${dto.dedupKey}`);
        return existing;
      }
    }

    // 2. Check User Preferences if customer recipient
    let shouldSendInApp = true;
    let shouldSendEmail = Boolean(dto.forceEmail);
    let shouldSendWebhook = false;
    let webhookUrl: string | undefined;

    if (dto.recipientId) {
      const pref = await this.preferenceModel.findOne({
        userId: new Types.ObjectId(dto.recipientId),
      });

      if (pref) {
        shouldSendInApp = pref.inAppEnabled;
        if (!dto.forceEmail) {
          shouldSendEmail = pref.emailEnabled;
        }
        shouldSendWebhook = Boolean(pref.webhookEnabled && pref.webhookUrl);
        webhookUrl = pref.webhookUrl;

        // Check event-level preference (if set to false and not critical)
        if (
          severity !== NotificationSeverity.CRITICAL &&
          pref.subscribedEvents &&
          pref.subscribedEvents[dto.type] === false
        ) {
          this.logger.debug(`User ${dto.recipientId} unsubscribed from event: ${dto.type}`);
          return null;
        }
      }
    }

    const channelsSent: NotificationChannel[] = [];
    if (shouldSendInApp) channelsSent.push(NotificationChannel.IN_APP);
    if (shouldSendEmail) channelsSent.push(NotificationChannel.EMAIL);
    if (shouldSendWebhook) channelsSent.push(NotificationChannel.WEBHOOK);

    // 3. Persist In-App Notification
    let notification: NotificationDocument | null = null;
    try {
      notification = await this.notificationModel.create({
        recipientType: dto.recipientType,
        recipientId: dto.recipientId ? new Types.ObjectId(dto.recipientId) : undefined,
        recipientEmail: dto.recipientEmail,
        type: dto.type,
        severity,
        title: dto.title,
        message: dto.message,
        data: dto.data || {},
        channelsSent,
        dedupKey: dto.dedupKey,
        actionUrl: dto.actionUrl,
        isRead: false,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Dedup key duplicate key error
        return null;
      }
      throw err;
    }

    // 4. Dispatch Email (simulated / transport)
    if (shouldSendEmail && dto.recipientEmail) {
      this.dispatchEmail(dto.recipientEmail, dto.title, dto.message, dto.data);
    }

    // 5. Dispatch Webhook
    if (shouldSendWebhook && webhookUrl) {
      this.dispatchWebhook(webhookUrl, dto);
    }

    return notification;
  }

  // ─── Convenience Helpers ───────────────────────────────────────────────

  async notifyCustomer(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
    options: { severity?: NotificationSeverity; dedupKey?: string; actionUrl?: string; email?: string } = {},
  ) {
    let email = options.email;
    if (!email) {
      const user = await this.userModel.findById(userId);
      email = user?.email;
    }

    return this.send({
      recipientType: NotificationRecipientType.CUSTOMER,
      recipientId: userId,
      recipientEmail: email,
      type,
      severity: options.severity || NotificationSeverity.INFO,
      title,
      message,
      data,
      dedupKey: options.dedupKey,
      actionUrl: options.actionUrl,
    });
  }

  async notifyAdmins(
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
    options: { severity?: NotificationSeverity; dedupKey?: string; actionUrl?: string } = {},
  ) {
    // Find all super_admin / admin users
    const admins = await this.userModel.find({
      role: { $in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
      isActive: true,
    });

    const promises = admins.map((admin) =>
      this.send({
        recipientType: NotificationRecipientType.ADMIN,
        recipientId: admin._id.toString(),
        recipientEmail: admin.email,
        type,
        severity: options.severity || NotificationSeverity.WARNING,
        title,
        message,
        data,
        dedupKey: options.dedupKey ? `${options.dedupKey}_${admin._id}` : undefined,
        actionUrl: options.actionUrl,
      }),
    );

    return Promise.all(promises);
  }

  // ─── Query Notifications ───────────────────────────────────────────────

  async getNotifications(
    user: { id: string; role: string },
    query: {
      isRead?: string;
      severity?: string;
      type?: string;
      product?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    const filter: any = {};

    if (isAdmin) {
      // Admin sees notifications targeted to ADMIN or specifically to their admin user ID
      filter.$or = [
        { recipientType: NotificationRecipientType.ADMIN },
        { recipientId: new Types.ObjectId(user.id) },
      ];
    } else {
      filter.recipientId = new Types.ObjectId(user.id);
      filter.recipientType = NotificationRecipientType.CUSTOMER;
    }

    if (query.isRead !== undefined && query.isRead !== 'all') {
      filter.isRead = String(query.isRead) === 'true';
    }

    if (query.severity && query.severity !== 'all') {
      filter.severity = query.severity;
    }

    if (query.type && query.type !== 'all') {
      filter.type = query.type;
    }

    if (query.product && query.product !== 'all') {
      filter['data.productId'] = query.product;
    }

    if (query.search) {
      const reg = new RegExp(query.search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: reg },
          { message: reg },
          { 'data.productName': reg },
          { 'data.domain': reg },
          { 'data.licenseKey': reg },
        ],
      });
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        ...filter,
        isRead: false,
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(user: { id: string; role: string }): Promise<number> {
    const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    const filter: any = { isRead: false };

    if (isAdmin) {
      filter.$or = [
        { recipientType: NotificationRecipientType.ADMIN },
        { recipientId: new Types.ObjectId(user.id) },
      ];
    } else {
      filter.recipientId = new Types.ObjectId(user.id);
      filter.recipientType = NotificationRecipientType.CUSTOMER;
    }

    return this.notificationModel.countDocuments(filter);
  }

  async markAsRead(id: string, user: { id: string; role: string }) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return { success: true, id };
  }

  async markAllAsRead(user: { id: string; role: string }) {
    const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    const filter: any = { isRead: false };

    if (isAdmin) {
      filter.$or = [
        { recipientType: NotificationRecipientType.ADMIN },
        { recipientId: new Types.ObjectId(user.id) },
      ];
    } else {
      filter.recipientId = new Types.ObjectId(user.id);
      filter.recipientType = NotificationRecipientType.CUSTOMER;
    }

    const res = await this.notificationModel.updateMany(filter, {
      $set: { isRead: true, readAt: new Date() },
    });

    return { success: true, updatedCount: res.modifiedCount };
  }

  async deleteNotification(id: string, user: { id: string; role: string }) {
    await this.notificationModel.findByIdAndDelete(id);
    return { success: true, id };
  }

  // ─── Notification Preferences ──────────────────────────────────────────

  async getPreferences(userId: string) {
    let pref = await this.preferenceModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!pref) {
      pref = await this.preferenceModel.create({
        userId: new Types.ObjectId(userId),
        inAppEnabled: true,
        emailEnabled: true,
        expiryReminderDays: [30, 7, 1],
      });
    }

    return pref;
  }

  async updatePreferences(userId: string, dto: any) {
    const update: any = {};
    if (dto.inAppEnabled !== undefined) update.inAppEnabled = Boolean(dto.inAppEnabled);
    if (dto.emailEnabled !== undefined) update.emailEnabled = Boolean(dto.emailEnabled);
    if (dto.webhookUrl !== undefined) update.webhookUrl = dto.webhookUrl;
    if (dto.webhookEnabled !== undefined) update.webhookEnabled = Boolean(dto.webhookEnabled);
    if (Array.isArray(dto.expiryReminderDays)) update.expiryReminderDays = dto.expiryReminderDays;
    if (dto.subscribedEvents) update.subscribedEvents = dto.subscribedEvents;

    const pref = await this.preferenceModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: update },
      { new: true, upsert: true },
    );

    return pref;
  }

  // ─── Automated Scheduled Expiry Reminders (Cron) ───────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyExpiryCheck() {
    this.logger.log('Running daily automated license & support expiry check...');
    await this.checkExpiryReminders();
  }

  async checkExpiryReminders(): Promise<{
    licenseExpiringCount: number;
    licenseExpiredCount: number;
    supportExpiringCount: number;
  }> {
    const now = new Date();
    const reminderDays = [30, 7, 1];
    let licenseExpiringCount = 0;
    let licenseExpiredCount = 0;
    let supportExpiringCount = 0;

    // 1. Check Active Licenses for Expiry Warning
    const activeLicenses = await this.licenseModel
      .find({
        status: LicenseStatus.ACTIVE,
        expiresAt: { $ne: null, $gt: now },
      })
      .populate<{ productId: ProductDocument }>('productId')
      .populate<{ userId: UserDocument }>('userId');

    for (const lic of activeLicenses) {
      if (!lic.expiresAt || !lic.userId) continue;

      const diffTime = lic.expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const productName = (lic.productId as any)?.name || 'Licensed Product';

      for (const day of reminderDays) {
        if (diffDays === day) {
          const dateStr = now.toISOString().slice(0, 10);
          const dedupKey = `lic_exp_${day}d_${lic._id}_${dateStr}`;

          await this.notifyCustomer(
            (lic.userId as any)._id.toString(),
            NotificationType.LICENSE_EXPIRING_SOON,
            `License Expiring in ${day} Day${day > 1 ? 's' : ''}: ${productName}`,
            `Your license key for ${productName} will expire in ${day} day${day > 1 ? 's' : ''} on ${lic.expiresAt.toLocaleDateString()}. Please renew to avoid service disruption.`,
            {
              licenseId: lic._id.toString(),
              licenseKey: lic.licenseKey,
              productId: (lic.productId as any)?._id?.toString(),
              productName,
              daysLeft: day,
              expiresAt: lic.expiresAt,
            },
            {
              severity: day === 1 ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING,
              dedupKey,
              actionUrl: `/dashboard/licenses`,
            },
          );

          licenseExpiringCount++;
        }
      }
    }

    // 2. Check for newly expired licenses
    const expiredLicenses = await this.licenseModel
      .find({
        status: LicenseStatus.ACTIVE,
        expiresAt: { $ne: null, $lte: now },
      })
      .populate<{ productId: ProductDocument }>('productId')
      .populate<{ userId: UserDocument }>('userId');

    for (const lic of expiredLicenses) {
      // Mark license status as EXPIRED
      lic.status = LicenseStatus.EXPIRED;
      await lic.save();

      const productName = (lic.productId as any)?.name || 'Licensed Product';
      const dedupKey = `lic_expired_${lic._id}`;

      if (lic.userId) {
        await this.notifyCustomer(
          (lic.userId as any)._id.toString(),
          NotificationType.LICENSE_EXPIRED,
          `License Expired: ${productName}`,
          `Your license key for ${productName} has expired. Product validations and automatic updates are now suspended.`,
          {
            licenseId: lic._id.toString(),
            licenseKey: lic.licenseKey,
            productId: (lic.productId as any)?._id?.toString(),
            productName,
            expiredAt: lic.expiresAt,
          },
          {
            severity: NotificationSeverity.ERROR,
            dedupKey,
            actionUrl: `/dashboard/licenses`,
          },
        );
      }

      licenseExpiredCount++;
    }

    // 3. Check Support Expiry Warning
    const supportLicenses = await this.licenseModel
      .find({
        supportExpiresAt: { $ne: null, $gt: now },
      })
      .populate<{ productId: ProductDocument }>('productId')
      .populate<{ userId: UserDocument }>('userId');

    for (const lic of supportLicenses) {
      if (!lic.supportExpiresAt || !lic.userId) continue;

      const diffTime = lic.supportExpiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const productName = (lic.productId as any)?.name || 'Licensed Product';

      if (reminderDays.includes(diffDays)) {
        const dateStr = now.toISOString().slice(0, 10);
        const dedupKey = `sup_exp_${diffDays}d_${lic._id}_${dateStr}`;

        await this.notifyCustomer(
          (lic.userId as any)._id.toString(),
          NotificationType.SUPPORT_EXPIRING_SOON,
          `Support Ending in ${diffDays} Day${diffDays > 1 ? 's' : ''}: ${productName}`,
          `Your premium support period for ${productName} will expire in ${diffDays} day${diffDays > 1 ? 's' : ''}.`,
          {
            licenseId: lic._id.toString(),
            productId: (lic.productId as any)?._id?.toString(),
            productName,
            daysLeft: diffDays,
            supportExpiresAt: lic.supportExpiresAt,
          },
          {
            severity: NotificationSeverity.INFO,
            dedupKey,
            actionUrl: `/dashboard/licenses`,
          },
        );

        supportExpiringCount++;
      }
    }

    return {
      licenseExpiringCount,
      licenseExpiredCount,
      supportExpiringCount,
    };
  }

  // ─── Dispatch Transports ────────────────────────────────────────────────

  private dispatchEmail(
    to: string,
    subject: string,
    message: string,
    data?: Record<string, any>,
  ) {
    this.logger.log(`[EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);
    // In production, this integrates with Nodemailer / SendGrid / Resend / AWS SES.
  }

  private dispatchWebhook(url: string, payload: any) {
    this.logger.log(`[WEBHOOK DISPATCH] Target: ${url} | Event: ${payload.type}`);
    // Async fire-and-forget webhook delivery
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LicenseNest-Webhook-Dispatcher/1.0',
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      this.logger.warn(`Webhook delivery to ${url} failed: ${err.message}`);
    });
  }
}
