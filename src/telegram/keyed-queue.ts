/**
 * Runs tasks with the same key one after another and tasks with different
 * keys concurrently. The bot uses the chat id as key, so a user's messages
 * reach Rasa in the order they were sent while other chats are not held up.
 */
export class KeyedQueue {
  private readonly tails = new Map<string, Promise<void>>();

  run(key: string, task: () => Promise<void>): Promise<void> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    // A failed task must not stop the ones queued behind it.
    const next = previous.catch(() => undefined).then(task);
    this.tails.set(key, next);
    const cleanup = () => {
      if (this.tails.get(key) === next) this.tails.delete(key);
    };
    next.then(cleanup, cleanup);
    return next;
  }

  /** Resolves once every task queued so far has finished. */
  async drain(): Promise<void> {
    await Promise.allSettled([...this.tails.values()]);
  }
}
