import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';

const MESSAGE_ID = '6ab497ab8b8210e0cf5762ce';

/** A mongoose query stub: chainable, resolving to `value` on lean(). */
function query(value: unknown) {
  const chain: any = {};
  for (const method of ['sort', 'skip', 'limit']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.lean = jest.fn().mockResolvedValue(value);
  return chain;
}

describe('ConversationsService', () => {
  let messages: Record<string, jest.Mock>;
  let intents: { countDocuments: jest.Mock };
  let nlu: { find: jest.Mock; updateOne: jest.Mock };
  let service: ConversationsService;

  const userMessage = {
    _id: MESSAGE_ID,
    from: 'user',
    text: ' 😚 ',
    intent: { name: 'affirm', confidence: 0.91 },
  };

  beforeEach(() => {
    messages = {
      findById: jest.fn(() => query(userMessage)),
      findByIdAndUpdate: jest.fn(() => query({ ...userMessage })),
      updateOne: jest.fn().mockResolvedValue({}),
      find: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };
    intents = { countDocuments: jest.fn().mockResolvedValue(1) };
    nlu = {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const connection = {
      db: {
        collection: (name: string) => (name === 'intents' ? intents : nlu),
      },
    };
    service = new ConversationsService(messages as any, connection as any);
  });

  describe('addToIntent', () => {
    it('appends the trimmed text to the intent examples and marks the message', async () => {
      await expect(
        service.addToIntent(MESSAGE_ID, 'chit_chat'),
      ).resolves.toEqual({
        intent: 'chit_chat',
        text: '😚',
        alreadyExisted: false,
      });

      expect(intents.countDocuments).toHaveBeenCalledWith({
        title: 'chit_chat',
      });
      expect(nlu.updateOne).toHaveBeenCalledWith(
        { intent: 'chit_chat' },
        expect.objectContaining({ $push: { examples: '😚' } }),
        { upsert: true },
      );
      expect(messages.updateOne).toHaveBeenCalledWith(
        { _id: MESSAGE_ID },
        {
          $set: {
            review: expect.objectContaining({
              status: 'added',
              intent: 'chit_chat',
            }),
          },
        },
      );
    });

    it('matches existing examples ignoring case and surrounding spaces', async () => {
      await service.addToIntent(MESSAGE_ID, 'chit_chat');

      const [[filter]] = nlu.find.mock.calls;
      expect(filter.examples.test('  😚 ')).toBe(true);
      expect(filter.examples.test('😚😚')).toBe(false);
    });

    it('does not add an example the intent already has', async () => {
      nlu.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ intent: 'chit_chat' }]),
      });

      await expect(
        service.addToIntent(MESSAGE_ID, 'chit_chat'),
      ).resolves.toMatchObject({ alreadyExisted: true });
      expect(nlu.updateOne).not.toHaveBeenCalled();
      expect(messages.updateOne).toHaveBeenCalled();
    });

    it('refuses an example that belongs to another intent', async () => {
      nlu.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ intent: 'affirm' }]),
      });

      await expect(
        service.addToIntent(MESSAGE_ID, 'chit_chat'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(nlu.updateOne).not.toHaveBeenCalled();
    });

    it('refuses an unknown intent', async () => {
      intents.countDocuments.mockResolvedValue(0);

      await expect(
        service.addToIntent(MESSAGE_ID, 'khong_co'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('only accepts user messages', async () => {
      messages.findById.mockReturnValue(query({ ...userMessage, from: 'bot' }));

      await expect(
        service.addToIntent(MESSAGE_ID, 'chit_chat'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reports a missing message', async () => {
      await expect(
        service.addToIntent('not-an-id', 'chit_chat'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(messages.findById).not.toHaveBeenCalled();
    });
  });

  describe('setReview', () => {
    it('flags a message as misunderstood', async () => {
      await service.setReview(MESSAGE_ID, 'wrong');

      expect(messages.findByIdAndUpdate).toHaveBeenCalledWith(
        MESSAGE_ID,
        { $set: { review: { status: 'wrong', at: expect.any(Date) } } },
        { new: true },
      );
    });

    it('puts a message back in review with open', async () => {
      await service.setReview(MESSAGE_ID, 'open');

      expect(messages.findByIdAndUpdate).toHaveBeenCalledWith(
        MESSAGE_ID,
        { $unset: { review: 1 } },
        { new: true },
      );
    });
  });

  it('labels each review item with its reason', async () => {
    messages.find.mockReturnValue(
      query([
        { ...userMessage, review: { status: 'wrong', at: new Date() } },
        { ...userMessage, intent: { name: 'nlu_fallback', confidence: 0.3 } },
      ]),
    );
    messages.countDocuments.mockResolvedValue(2);

    const { items, total } = await service.reviewQueue(50, 0);

    expect(total).toBe(2);
    expect(items.map((item) => item.reason)).toEqual(['flagged', 'fallback']);
  });
});
