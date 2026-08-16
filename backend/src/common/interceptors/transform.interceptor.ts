import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { getApiResponseViewerTemplate } from '../templates/api-response-viewer.template';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  requestId: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, any>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const startTime = performance.now();
    const requestId = uuidv4();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    response.setHeader('X-Request-ID', requestId);

    return next.handle().pipe(
      map((resData) => {
        // If response is already text/html (like docs portal), pass through directly
        const contentType = response.getHeader('Content-Type') || '';
        if (typeof resData === 'string' && contentType.toString().includes('text/html')) {
          return resData;
        }

        // If the returned object already defines message and data structure, handle nicely
        let message = 'Operation successful';
        let data = resData;

        if (
          resData &&
          typeof resData === 'object' &&
          'data' in resData &&
          'message' in resData
        ) {
          message = resData.message;
          data = resData.data;
        }

        const payload = {
          success: true,
          message,
          data,
          requestId,
          timestamp: new Date().toISOString(),
        };

        const acceptHeader = request.headers['accept'] || '';
        const isBrowser = acceptHeader.includes('text/html');

        if (isBrowser) {
          const latencyMs = Math.round(performance.now() - startTime);
          const clientIp = request.ip || request.connection?.remoteAddress || '127.0.0.1';
          
          response.setHeader('Content-Type', 'text/html');
          return getApiResponseViewerTemplate(
            request.url,
            request.method,
            response.statusCode || 200,
            payload,
            latencyMs,
            clientIp,
            request.headers,
          );
        }

        return payload;
      }),
    );
  }
}
