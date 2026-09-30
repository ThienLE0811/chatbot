import { ConflictException, NotFoundException } from '@nestjs/common';
import { NluService } from '../nlu/nlu.service';
import { IntentsService } from './intents.service';

const ID = '6ab497ab8b8210e0cf5762ce';

/** A mongoose query stub resolving to `value` on lean().exec() or exec(). */
function query(value: unknown) {
  const exec = jest.fn().mockResolvedValue(value);
  return { lean: jest.fn(() => ({ exec })), exec };
}

describe('IntentsService', () => {
  let intents: Record<string, jest.Mock>;
  let nlu: Record<string, jest.Mock>;
  let nluDocs: { intent: string; examples: string[] }[];
  let service: IntentsService;

  const greet = { _id: ID, title: 'greet', description: 'Chào hỏi' };

  beforeEach(() => {
    nluDocs = [
      { intent: 'greet', examples: ['xin chào', 'hello'] },
      { intent: 'goodbye', examples: ['tạm biệt'] },
    ];
    intents = {
      find: jest.fn(() => query([greet])),
      findById: jest.fn(() => query(greet)),
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ _id: ID }),
      updateOne: jest.fn(() => query({})),
      deleteOne: jest.fn(() => query({})),
    };
    nlu = {
      // Answers both lookups the service makes: `$in` (own) and `$nin` (others).
      find: jest.fn(({ intent }) =>
        query(
          nluDocs.filter((doc) =>
            intent.$in
              ? intent.$in.includes(doc.intent)
              : !intent.$nin.includes(doc.intent),
          ),
        ),
      ),
      updateOne: jest.fn(() => query({})),
      deleteOne: jest.fn(() => query({})),
    };
    service = new IntentsService(
      intents as any,
      new NluService(nlu as any, intents as any),
    );
  });

  describe('findAll', () => {
    it('returns each intent with the examples from nlu', async () => {
      await expect(service.findAll()).resolves.toEqual([
        expect.objectContaining({
          title: 'greet',
          description: 'Chào hỏi',
          examples: ['xin chào', 'hello'],
        }),
      ]);
    });

    it('ignores a filter that is not a plain string', async () => {
      await service.findAll({ $ne: 'x' });
      expect(intents.find).toHaveBeenCalledWith({});
    });
  });

  describe('create', () => {
    it('saves the name on the intent and the cleaned examples in nlu', async () => {
      nluDocs = [];
      await service.create({
        title: 'not_finished',
        description: 'Muốn hỏi tiếp',
        examples: [' khoan đã ', 'Khoan đã', ''],
      });

      expect(intents.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ examples: expect.anything() }),
      );
      expect(nlu.updateOne).toHaveBeenCalledWith(
        { intent: 'not_finished' },
        expect.objectContaining({
          $set: expect.objectContaining({ examples: ['khoan đã'] }),
        }),
        { upsert: true },
      );
    });

    it('refuses a code that is already used', async () => {
      intents.exists.mockResolvedValue({ _id: ID });
      await expect(service.create({ title: 'greet' })).rejects.toThrow(
        ConflictException,
      );
      expect(intents.create).not.toHaveBeenCalled();
    });

    it('refuses an example another intent has, before writing anything', async () => {
      await expect(
        service.create({ title: 'bye', examples: ['Tạm biệt'] }),
      ).rejects.toThrow('"Tạm biệt" (ý định "goodbye")');
      expect(intents.create).not.toHaveBeenCalled();
      expect(nlu.updateOne).not.toHaveBeenCalled();
    });

    it('leaves nlu alone when no examples are sent', async () => {
      await service.create({ title: 'not_finished' });
      expect(nlu.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('replaces the examples in nlu, keeping its own existing ones allowed', async () => {
      await service.update(ID, { examples: ['hello', 'chào bạn'] });
      expect(nlu.updateOne).toHaveBeenCalledWith(
        { intent: 'greet' },
        expect.objectContaining({
          $set: expect.objectContaining({ examples: ['hello', 'chào bạn'] }),
        }),
        { upsert: true },
      );
    });

    it('only changes the description when that is all that was sent', async () => {
      await service.update(ID, { description: 'Người dùng chào' });
      expect(intents.updateOne).toHaveBeenCalledWith(
        { _id: ID },
        {
          $set: expect.objectContaining({
            title: 'greet',
            description: 'Người dùng chào',
          }),
        },
      );
      expect(nlu.updateOne).not.toHaveBeenCalled();
    });

    it('moves the examples to the new code when renamed', async () => {
      await service.update(ID, { title: 'hello_intent' });
      expect(nlu.deleteOne).toHaveBeenCalledWith({ intent: 'greet' });
      expect(nlu.updateOne).toHaveBeenCalledWith(
        { intent: 'hello_intent' },
        expect.objectContaining({
          $set: expect.objectContaining({ examples: ['xin chào', 'hello'] }),
        }),
        { upsert: true },
      );
    });

    it('answers 404 for an unknown or malformed id', async () => {
      intents.findById.mockReturnValue(query(null));
      await expect(service.update(ID, {})).rejects.toThrow(NotFoundException);
      await expect(service.update('abc', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('removes the examples too, so they are not trained any more', async () => {
      await service.delete(ID);
      expect(intents.deleteOne).toHaveBeenCalledWith({ _id: ID });
      expect(nlu.deleteOne).toHaveBeenCalledWith({ intent: 'greet' });
    });
  });
});
