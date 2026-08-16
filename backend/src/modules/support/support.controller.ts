import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupportService } from './support.service';
import {
  CreateTicketDto,
  ReplyTicketDto,
  AssignTicketDto,
  UpdateTicketStatusDto,
  RateTicketDto,
  QueryTicketsDto,
} from './dto/ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ---------------- CUSTOMER SUPPORT ROUTES ----------------
  @UseGuards(JwtAuthGuard)
  @Get('customer/support/context')
  async getCustomerContext(@CurrentUser('id') userId: string) {
    return this.supportService.getCustomerContext(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer/support/tickets')
  async createTicket(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
    @CurrentUser('fullName') userName: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(userId, dto, userEmail, userName);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/support/tickets')
  async getCustomerTickets(
    @CurrentUser('id') userId: string,
    @Query() query: QueryTicketsDto,
  ) {
    return this.supportService.getCustomerTickets(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/support/tickets/:id')
  async getCustomerTicketDetail(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
  ) {
    return this.supportService.getTicketById(ticketId, userId, 'customer');
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer/support/tickets/:id/reply')
  async customerReplyTicket(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
    @CurrentUser('fullName') userName: string,
    @Param('id') ticketId: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.supportService.replyTicket(ticketId, userId, userEmail, userName, 'customer', {
      ...dto,
      isInternalNote: false, // Customers cannot post internal notes
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer/support/tickets/:id/rate')
  async rateTicket(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
    @Body() dto: RateTicketDto,
  ) {
    return this.supportService.rateTicket(ticketId, userId, dto);
  }

  // ---------------- ADMIN SUPPORT DESK ROUTES ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/support/tickets')
  async getAdminTickets(@Query() query: QueryTicketsDto) {
    return this.supportService.getAdminTickets(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/support/tickets/stats')
  async getStats() {
    return this.supportService.getSupportStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/support/tickets/:id')
  async getAdminTicketDetail(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: string,
    @Param('id') ticketId: string,
  ) {
    return this.supportService.getTicketById(ticketId, adminId, adminRole || 'admin');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/support/tickets/:id/verification')
  async getVerificationContext(@Param('id') ticketId: string) {
    return this.supportService.getVerificationContext(ticketId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/support/tickets/:id/reply')
  async adminReplyTicket(
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
    @CurrentUser('fullName') adminName: string,
    @CurrentUser('role') adminRole: string,
    @Param('id') ticketId: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.supportService.replyTicket(ticketId, adminId, adminEmail, adminName, adminRole || 'admin', dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/support/tickets/:id/assign')
  async assignTicket(
    @CurrentUser('email') adminEmail: string,
    @Param('id') ticketId: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.supportService.assignTicket(ticketId, dto, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch('admin/support/tickets/:id/status')
  async updateStatus(
    @CurrentUser('email') adminEmail: string,
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.supportService.updateStatus(ticketId, dto, adminEmail);
  }
}
