import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

/** Named throttlers; each route skips the ones that are not its own. */
export const LOGIN_THROTTLER = 'login';
export const REGISTER_THROTTLER = 'register';

/**
 * Login and sign-up attempts allowed per IP, read from the environment so
 * they can be tuned without a code change (a restart is still needed).
 * Counters are kept in memory, per backend instance.
 */
export function rateLimitsFromConfig(
  config: ConfigService,
): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: LOGIN_THROTTLER,
        limit: positiveInt(config, 'LOGIN_RATE_LIMIT', 10),
        ttl: positiveInt(config, 'LOGIN_RATE_WINDOW_SECONDS', 60) * 1000,
      },
      {
        name: REGISTER_THROTTLER,
        limit: positiveInt(config, 'REGISTER_RATE_LIMIT', 5),
        ttl: positiveInt(config, 'REGISTER_RATE_WINDOW_SECONDS', 3600) * 1000,
      },
    ],
    errorMessage: 'Bạn thử quá nhiều lần, vui lòng đợi một lúc rồi thử lại',
  };
}

/** A typo must stop the boot, not silently fall back to the default. */
function positiveInt(config: ConfigService, key: string, fallback: number) {
  const raw = config.get<string | number>(key);
  if (raw === undefined || String(raw).trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer, got "${raw}"`);
  }
  return value;
}
