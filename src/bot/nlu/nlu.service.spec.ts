import { ConflictException, NotFoundException } from '@nestjs/common';
import { NluService } from './nlu.service';

const ID = '6ab497ab8b8210e0cf5762ce';

/** A mongoose query stub resolving to `value` on lean().exec() or exec(). */
function query(value: unknown) {
  const exec = jest.fn().mockResolvedValue(value);
  return { lean: jest.fn(() => ({ exec })), exec };
}

describe('NluService', () => {
  let nlu: Record<string, jest.Mock>;
  let intents: Record<string, jest.Mock>;
  let docs: { _id?: string; intent: string; examples: string[] }[];
  let service: NluService;

  beforeEach(() => {
    docs = [
      { _id: ID, intent: 'greet', examples: ['xin chào', ' hello ', 'Hello'] },
      { intent: 'goodbye', examples: ['tạm biệt'] },
    ];
    nlu = {
      find: jest.fn((filter) => {
        const intent = filter.intent;
        return query(
          docs.filter((doc) =>
            intent?.$in
              ? intent.$in.includes(doc.intent)
              : intent?.$nin
              ? !intent.$nin.includes(doc.intent)
              : !intent || doc.intent === intent,
          ),
        );
      }),
      findById: jest.fn(() => query(docs[0])),
      exists: jest.fn(async ({ intent }) =>
        docs.some((doc) => doc.intent === intent) ? { _id: ID } : null,
      ),
      create: jest.fn().mockResolvedValue({ _id: ID }),
      updateOne: jest.fn(() => query({})),
      deleteOne: jest.fn(() => query({})),
    };
    intents = {
      exists: jest.fn().mockResolvedValue({ _id: 'x' }),
      find: jest.fn(() =>
        query([
          { title: 'greet', description: 'Người dùng chào hỏi' },
          { title: 'goodbye' },
        ]),
      ),
    };
    service = new NluService(nlu as any, intents as any);
  });

  describe('findAll', () => {
    it('adds the Vietnamese name and cleans the examples', async () => {
      const [greet, goodbye] = await service.findAll();
      expect(greet).toEqual(
        expect.objectContaining({
          intent: 'greet',
          intentDescription: 'Người dùng chào hỏi',
          examples: ['xin chào', 'hello'],
        }),
      );
      expect(goodbye.intentDescription).toBeUndefined();
    });

    it('ignores a filter that is not a plain string', async () => {
      await service.findAll({ $ne: 'x' });
      expect(nlu.find).toHaveBeenCalledWith({});
    });
  });

  describe('create', () => {
    it('saves the cleaned examples of an intent that has none yet', async () => {
      await service.create({
        intent: 'thank',
        examples: [' cảm ơn ', 'Cảm ơn', '', 'thanks'],
      });
      expect(nlu.create).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: 'thank',
          examples: ['cảm ơn', 'thanks'],
        }),
      );
    });

    it('refuses an intent that does not exist', async () => {
      intents.exists.mockResolvedValue(null);
      await expect(
        service.create({ intent: 'unknown', examples: ['a'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses a second list for the same intent', async () => {
      await expect(
        service.create({ intent: 'greet', examples: ['chào'] }),
      ).rejects.toThrow('hãy sửa dòng đó');
      expect(nlu.create).not.toHaveBeenCalled();
    });

    it('refuses an example another intent has', async () => {
      await expect(
        service.create({ intent: 'thank', examples: ['Tạm biệt'] }),
      ).rejects.toThrow(ConflictException);
      expect(nlu.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('replaces the examples with the cleaned list', async () => {
      await service.update(ID, { examples: ['hello', ' HELLO', 'chào bạn'] });
      expect(nlu.updateOne).toHaveBeenCalledWith(
        { _id: ID },
        {
          $set: expect.objectContaining({
            intent: 'greet',
            examples: ['hello', 'chào bạn'],
          }),
        },
      );
    });

    it('refuses an example another intent has', async () => {
      await expect(
        service.update(ID, { examples: ['tạm biệt'] }),
      ).rejects.toThrow('"tạm biệt" (ý định "goodbye")');
      expect(nlu.updateOne).not.toHaveBeenCalled();
    });

    it('refuses moving the list to an intent that already has one', async () => {
      await expect(service.update(ID, { intent: 'goodbye' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('answers 404 for an unknown or malformed id', async () => {
      nlu.findById.mockReturnValue(query(null));
      await expect(service.update(ID, {})).rejects.toThrow(NotFoundException);
      await expect(service.update('abc', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
