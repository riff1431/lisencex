import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, NotificationType, NotificationSeverity } from '../../common/enums/app.enums';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── List Notifications for Current User (Admin or Customer) ─────────────

  @Get()
  async getNotifications(
    @CurrentUser() user: any,
    @Query() query: any,
  ) {
    return this.notificationsService.getNotifications(
      { id: user.id || user._id, role: user.role },
      query,
    );
  }

  // ── Get Unread Count ───────────────────────────────────────────────────

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    const unreadCount = await this.notificationsService.getUnreadCount({
      id: user.id || user._id,
      role: user.role,
    });
    return { unreadCount };
  }

  // ── Mark Notification as Read ──────────────────────────────────────────

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAsRead(id, {
      id: user.id || user._id,
      role: user.role,
    });
  }

  // ── Mark All as Read ───────────────────────────────────────────────────

  @Post('mark-all-read')
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead({
      id: user.id || user._id,
      role: user.role,
    });
  }

  // ── Delete Notification ────────────────────────────────────────────────

  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.deleteNotification(id, {
      id: user.id || user._id,
      role: user.role,
    });
  }

  // ── Get User Notification Preferences ──────────────────────────────────

  @Get('preferences')
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  // ── Update User Notification Preferences ───────────────────────────────

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }

  // ── Admin: Trigger Expiry Check On Demand ──────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/run-expiry-check')
  async runExpiryCheck() {
    return this.notificationsService.checkExpiryReminders();
  }

  // ── Admin: Trigger Test Notification ───────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/test')
  async sendTestNotification(
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    const type = body.type || NotificationType.SYSTEM_ALERT;
    const severity = body.severity || NotificationSeverity.INFO;
    const title = body.title || 'System Test Alert';
    const message = body.message || 'This is a test notification generated from the Admin Notification Center.';

    if (body.target === 'customer' && body.customerId) {
      return this.notificationsService.notifyCustomer(
        body.customerId,
        type,
        title,
        message,
        body.data || {},
        { severity },
      );
    }

    return this.notificationsService.notifyAdmins(
      type,
      title,
      message,
      body.data || { triggeredBy: user.email },
      { severity },
    );
  }
}
