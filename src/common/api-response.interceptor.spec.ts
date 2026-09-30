// Route handlers below only carry decorators.
/* eslint-disable @typescript-eslint/no-empty-function */
import { ExecutionContext, Sse, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { RawResponse } from './api-response';
import { ApiResponseInterceptor } from './api-response.interceptor';

class Routes {
  plain() {}
  @RawResponse() raw() {}
  @Sse() stream() {}
}

@RawResponse()
class RawRoutes {
  plain() {}
}

function contextFor(
  handler: (...args: unknown[]) => unknown,
  cls: object = Routes,
): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

describe('ApiResponseInterceptor', () => {
  const interceptor = new ApiResponseInterceptor(new Reflector());
  const run = (context: ExecutionContext, value: unknown) =>
    lastValueFrom(interceptor.intercept(context, { handle: () => of(value) }));

  it('wraps what the handler returns', async () => {
    await expect(
      run(contextFor(Routes.prototype.plain), [1, 2]),
    ).resolves.toEqual({ status: 'OK', data: [1, 2] });
  });

  it('sends null when the handler returns nothing', async () => {
    await expect(
      run(contextFor(Routes.prototype.plain), undefined),
    ).resolves.toEqual({ status: 'OK', data: null });
  });

  it('leaves @RawResponse() routes and controllers alone', async () => {
    await expect(run(contextFor(Routes.prototype.raw), 'yaml')).resolves.toBe(
      'yaml',
    );
    await expect(
      run(contextFor(RawRoutes.prototype.plain, RawRoutes), { ok: true }),
    ).resolves.toEqual({ ok: true });
  });

  it('leaves SSE events alone', async () => {
    const event = { data: { type: 'ping' } };
    await expect(run(contextFor(Routes.prototype.stream), event)).resolves.toBe(
      event,
    );
  });

  it('leaves files alone', async () => {
    const file = new StreamableFile(Buffer.from('x'));
    await expect(run(contextFor(Routes.prototype.plain), file)).resolves.toBe(
      file,
    );
  });
});
