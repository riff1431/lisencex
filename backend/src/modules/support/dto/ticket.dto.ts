import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../../database/schemas/ticket.schema';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  purchaseId?: string;

  @IsOptional()
  @IsString()
  licenseId?: string;

  @IsOptional()
  @IsString()
  activationId?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
}

export class ReplyTicketDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsBoolean()
  isInternalNote?: boolean;

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;

  @IsOptional()
  @IsEnum(TicketStatus)
  statusTransition?: TicketStatus;
}

export class AssignTicketDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @IsOptional()
  @IsString()
  resolutionSummary?: string;
}

export class RateTicketDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class QueryTicketsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  marketplaceSource?: string;

  @IsOptional()
  @IsString()
  assignedAgentId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
