import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MarketplaceProviderType } from '../../common/enums/app.enums';

export type TicketDocument = Ticket & Document;

export enum TicketCategory {
  TECHNICAL_ISSUE = 'technical_issue',
  LICENSE_ACTIVATION = 'license_activation',
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  PRE_SALE = 'pre_sale',
  BILLING_REFUND = 'billing_refund',
  GENERAL_INQUIRY = 'general_inquiry',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SenderRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  AGENT = 'agent',
  SYSTEM = 'system',
}

@Schema({ _id: false })
export class TicketAttachment {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  size?: number;

  @Prop()
  mimeType?: string;
}

@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class TicketMessage {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  senderId?: Types.ObjectId;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  senderEmail: string;

  @Prop({ required: true, enum: SenderRole, default: SenderRole.CUSTOMER })
  senderRole: SenderRole;

  @Prop({ required: true })
  message: string;

  @Prop({ type: [TicketAttachment], default: [] })
  attachments: TicketAttachment[];

  @Prop({ default: false })
  isInternalNote: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ required: true, unique: true, index: true })
  ticketNumber: string; // e.g. TCK-1001

  // Customer linkage
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true, index: true })
  customerEmail: string;

  // Product linkage
  @Prop({ type: Types.ObjectId, ref: 'Product', index: true })
  productId?: Types.ObjectId;

  @Prop()
  productName?: string;

  @Prop()
  productSlug?: string;

  // Purchase & Marketplace linkage
  @Prop({ type: Types.ObjectId, ref: 'Purchase', index: true })
  purchaseId?: Types.ObjectId;

  @Prop()
  purchaseKey?: string;

  @Prop({ enum: MarketplaceProviderType, default: MarketplaceProviderType.INTERNAL })
  marketplaceSource: MarketplaceProviderType;

  // License linkage
  @Prop({ type: Types.ObjectId, ref: 'License', index: true })
  licenseId?: Types.ObjectId;

  @Prop()
  licenseKey?: string;

  @Prop()
  licenseStatus?: string;

  // Installation / Domain linkage
  @Prop({ type: Types.ObjectId, ref: 'Activation' })
  activationId?: Types.ObjectId;

  @Prop()
  domain?: string;

  // Ticket categorization & lifecycle
  @Prop({ required: true, enum: TicketCategory, default: TicketCategory.TECHNICAL_ISSUE, index: true })
  category: TicketCategory;

  @Prop({ required: true, enum: TicketPriority, default: TicketPriority.MEDIUM, index: true })
  priority: TicketPriority;

  @Prop({ required: true, enum: TicketStatus, default: TicketStatus.OPEN, index: true })
  status: TicketStatus;

  @Prop({ required: true })
  subject: string;

  @Prop({ type: [TicketMessage], default: [] })
  messages: TicketMessage[];

  // Agent assignment
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedAgentId?: Types.ObjectId;

  @Prop()
  assignedAgentName?: string;

  @Prop()
  assignedAgentEmail?: string;

  // Support Window Verification
  @Prop()
  supportExpiryDate?: Date;

  @Prop({ default: true })
  isSupportActive: boolean;

  // Resolution & Activity Timestamps
  @Prop()
  lastRepliedAt?: Date;

  @Prop({ enum: SenderRole })
  lastRepliedByRole?: SenderRole;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  closedAt?: Date;

  @Prop()
  resolutionSummary?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  // Customer satisfaction rating
  @Prop({
    type: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: { type: String },
      ratedAt: { type: Date },
    },
  })
  rating?: {
    rating: number;
    feedback?: string;
    ratedAt: Date;
  };
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ productId: 1, status: 1 });
TicketSchema.index({ assignedAgentId: 1, status: 1 });
TicketSchema.index({ status: 1, priority: 1 });
