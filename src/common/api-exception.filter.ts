import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiError, ApiResponse } from './api-response';

/** Sends every error as `{ status: 'FAILED', data: { statusCode, message } }`. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;
    const res = host.switchToHttp().getResponse<Response>();
    const error = this.toApiError(exception);
    // An SSE stream has already sent its headers; nothing more can be said.
    if (res.headersSent) return;
    const body: ApiResponse<ApiError> = { status: 'FAILED', data: error };
    res.status(error.statusCode).json(body);
  }

  private toApiError(exception: unknown): ApiError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { statusCode, message: response };
      }
      // Keeps extra fields, such as the running job's id on a 409, and the
      // per-field messages of a validation error.
      return { statusCode, message: exception.message, ...response };
    }
    if (isDuplicateKey(exception)) {
      // A unique index refused the write, e.g. two stories with one name, or
      // two requests racing past the service's own "already exists" check.
      const [field, value] = Object.entries(exception.keyValue ?? {})[0] ?? [];
      return {
        statusCode: HttpStatus.CONFLICT,
        message: field
          ? `Giá trị "${value}" của trường ${field} đã tồn tại`
          : 'Dữ liệu đã tồn tại',
      };
    }
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}

/** Mongo's E11000, raised by a unique index. */
function isDuplicateKey(
  error: unknown,
): error is { code: 11000; keyValue?: Record<string, unknown> } {
  return (error as { code?: unknown })?.code === 11000;
}
