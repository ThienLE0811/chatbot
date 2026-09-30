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
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
