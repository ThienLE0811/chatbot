import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { ApiResponse, RAW_RESPONSE_KEY } from './api-response';

/** Wraps what a handler returns in `{ status: 'OK', data }`. */
@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || this.isRaw(context)) {
      return next.handle();
    }
    return next
      .handle()
      .pipe(
        map((data): ApiResponse | StreamableFile =>
          data instanceof StreamableFile
            ? data
            : { status: 'OK', data: data ?? null },
        ),
      );
  }

  /** SSE streams map every event through here, so they stay unwrapped. */
  private isRaw(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    return (
      this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, targets) ===
        true || this.reflector.get<boolean>(SSE_METADATA, targets[0]) === true
    );
  }
}
