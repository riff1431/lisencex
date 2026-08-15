import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  requestId: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const requestId = uuidv4();
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Request-ID', requestId);

    return next.handle().pipe(
      map((resData) => {
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

        return {
          success: true,
          message,
          data,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
