import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';

/** Parses REDIS_URL (redis:// or rediss://) into options shared by BullMQ and pub/sub. */
export function redisOptionsFromConfig(config: ConfigService): RedisOptions {
  const url = new URL(config.get<string>('REDIS_URL', DEFAULT_REDIS_URL));
  const db = url.pathname.replace('/', '');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: db ? Number(db) : undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
