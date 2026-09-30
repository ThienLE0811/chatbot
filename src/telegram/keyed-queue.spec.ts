import { KeyedQueue } from './keyed-queue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('KeyedQueue', () => {
  it('runs tasks with the same key in order', async () => {
    const queue = new KeyedQueue();
    const order: string[] = [];
    const first = deferred();

    const a = queue.run('chat', async () => {
      await first.promise;
      order.push('a');
    });
    const b = queue.run('chat', async () => {
      order.push('b');
    });
    first.resolve();
    await Promise.all([a, b]);

    expect(order).toEqual(['a', 'b']);
  });

  it('does not hold up other keys', async () => {
    const queue = new KeyedQueue();
    const blocked = deferred();
    const order: string[] = [];

    const slow = queue.run('chat-1', async () => {
      await blocked.promise;
      order.push('slow');
    });
    await queue.run('chat-2', async () => {
      order.push('fast');
    });
    blocked.resolve();
    await slow;

    expect(order).toEqual(['fast', 'slow']);
  });

  it('keeps going after a failed task', async () => {
    const queue = new KeyedQueue();
    const failed = queue.run('chat', async () => {
      throw new Error('boom');
    });
    const next = jest.fn(async () => undefined);

    await expect(failed).rejects.toThrow('boom');
    await queue.run('chat', next);

    expect(next).toHaveBeenCalled();
  });

  it('drains every pending task', async () => {
    const queue = new KeyedQueue();
    const done: string[] = [];
    queue.run('a', async () => void done.push('a'));
    queue.run('b', async () => void done.push('b'));

    await queue.drain();

    expect(done.sort()).toEqual(['a', 'b']);
  });
});
