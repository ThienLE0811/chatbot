import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { rateLimitsFromConfig } from './rate-limits';

describe('AuthController rate limits', () => {
  let app: INestApplication;

  async function start(env: Record<string, string>) {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot(rateLimitsFromConfig(new ConfigService(env))),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({}),
            register: jest.fn(),
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }

  afterEach(() => app?.close());

  const login = () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ userName: 'admin', password: 'wrong-password' });
  const register = () =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ userName: 'x', password: 'short', email: 'x' });

  it('refuses the 11th login within a minute by default', async () => {
    await start({});
    for (let i = 0; i < 10; i++) await login().expect(200);
    await login().expect(429);
  });

  it('refuses the 6th sign-up within an hour by default', async () => {
    await start({});
    // Invalid bodies still count: the limit is checked before validation.
    for (let i = 0; i < 5; i++) await register().expect(400);
    await register().expect(429);
  });

  it('takes its limits from the environment', async () => {
    await start({ LOGIN_RATE_LIMIT: '3', REGISTER_RATE_LIMIT: '1' });
    for (let i = 0; i < 3; i++) await login().expect(200);
    await login().expect(429);
    await register().expect(400);
    await register().expect(429);
  });

  it('counts logins and sign-ups separately', async () => {
    await start({ LOGIN_RATE_LIMIT: '1' });
    await login().expect(200);
    await login().expect(429);
    await register().expect(400);
  });
});

describe('rateLimitsFromConfig', () => {
  it('reads the window in seconds', () => {
    const options = rateLimitsFromConfig(
      new ConfigService({ LOGIN_RATE_WINDOW_SECONDS: '300' }),
    );
    expect(Array.isArray(options) ? options : options.throttlers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'login', limit: 10, ttl: 300_000 }),
      ]),
    );
  });

  it.each(['0', '-5', '2.5', 'ten'])(
    'refuses to start with LOGIN_RATE_LIMIT=%s',
    (value) => {
      expect(() =>
        rateLimitsFromConfig(new ConfigService({ LOGIN_RATE_LIMIT: value })),
      ).toThrow('LOGIN_RATE_LIMIT must be a positive integer');
    },
  );
});
