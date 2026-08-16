import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';
import { PaymentGatewayType } from '../../../database/schemas/payment-transaction.schema';

export class InitiateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(PaymentGatewayType)
  gateway: PaymentGatewayType;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @IsOptional()
  @IsObject()
  paymentMethodDetails?: Record<string, any>;
}

export class SimulatorCompleteDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsNotEmpty()
  simulatedToken: string;

  @IsOptional()
  @IsString()
  action?: 'success' | 'decline' | 'error';

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsString()
  cardLast4?: string;
}

export class ProcessRefundDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsBoolean()
  revokeLicense?: boolean;

  @IsOptional()
  @IsBoolean()
  suspendActivations?: boolean;

  @IsOptional()
  @IsBoolean()
  disableDownloadsUpdates?: boolean;
}

export class ManualVerifyDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PaymentTransactionsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
