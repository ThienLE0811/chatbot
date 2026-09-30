import { SetMetadata } from '@nestjs/common';

export type ApiStatus = 'OK' | 'FAILED';

/** Body of every JSON response: `data` is the payload, or the error on FAILED. */
export interface ApiResponse<T = unknown> {
  status: ApiStatus;
  data: T;
}

/** On FAILED, `data` carries the HTTP status and the error message. */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  [key: string]: unknown;
}

export const RAW_RESPONSE_KEY = 'rawResponse';

/**
 * Sends the handler's return value as is, outside the envelope: for callers
 * that expect their own format (Telegram, Rasa) or non-JSON bodies.
 * SSE routes are skipped without it.
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
