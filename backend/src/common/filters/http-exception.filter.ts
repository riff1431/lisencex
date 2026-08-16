import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCode } from '../enums/error-code.enum';
import { getApiResponseViewerTemplate } from '../templates/api-response-viewer.template';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers['x-request-id'] as string) || uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_ERROR;
    let message = 'An unexpected internal error occurred';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || obj.error || message;
        code = obj.code || this.mapStatusToErrorCode(status);
        if (Array.isArray(obj.message)) {
          // Class validator error
          code = ErrorCode.VALIDATION_ERROR;
          message = obj.message.join(', ');
          details = obj.message;
        } else {
          details = obj.details || null;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${exception.message}`,
        exception.stack,
      );
    }

    const errorPayload = {
      success: false,
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    };

    const acceptHeader = request.headers['accept'] || '';
    const isBrowser = acceptHeader.includes('text/html');

    if (isBrowser) {
      const clientIp = request.ip || request.connection?.remoteAddress || '127.0.0.1';
      response.setHeader('Content-Type', 'text/html');
      
      const html = getApiResponseViewerTemplate(
        request.url,
        request.method,
        status,
        errorPayload,
        0, // Latency is 0 for immediate exceptions
        clientIp,
        request.headers,
      );
      
      response.status(status).send(html);
      return;
    }

    response.status(status).json(errorPayload);
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.PRODUCT_NOT_FOUND;
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
