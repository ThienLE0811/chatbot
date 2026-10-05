import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { byName, deleteRecord, findRecord, updateRecord } from './records';

const ID = '64b7f0c2a1b2c3d4e5f60718';

function modelReturning(record: unknown) {
  const query = { exec: jest.fn().mockResolvedValue(record) };
  return {
    findById: jest.fn().mockReturnValue(query),
    findByIdAndUpdate: jest.fn().mockReturnValue(query),
    findByIdAndDelete: jest.fn().mockReturnValue(query),
  } as unknown as Model<unknown> & Record<string, jest.Mock>;
}

describe('byName', () => {
  it('filters on a plain string', () => {
    expect(byName('story', 'greet')).toEqual({ story: 'greet' });
  });

  it('ignores operators smuggled in through the query string', () => {
    expect(byName('story', { $ne: 'x' })).toEqual({});
    expect(byName('story', ['a', 'b'])).toEqual({});
  });

  it('lists everything without a name', () => {
    expect(byName('story', undefined)).toEqual({});
    expect(byName('story', '')).toEqual({});
  });
});

describe('findRecord', () => {
  it('returns the record', async () => {
    const model = modelReturning({ story: 'greet' });
    await expect(findRecord(model, ID, 'missing')).resolves.toEqual({
      story: 'greet',
    });
  });

  it('answers 404 for a malformed id without querying', async () => {
    const model = modelReturning(null);
    await expect(findRecord(model, 'nope', 'missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(model.findById).not.toHaveBeenCalled();
  });

  it('answers 404 when nothing matches', async () => {
    await expect(
      findRecord(modelReturning(null), ID, 'missing'),
    ).rejects.toThrow('missing');
  });
});

describe('updateRecord', () => {
  it('sets only the given fields', async () => {
    const model = modelReturning({ story: 'greet' });
    await updateRecord(model, ID, { story: 'greet' }, 'missing');
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      ID,
      { $set: { story: 'greet' } },
      { new: true, runValidators: true },
    );
  });

  it('answers 404 when nothing matches', async () => {
    await expect(
      updateRecord(modelReturning(null), ID, {}, 'missing'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('deleteRecord', () => {
  it('answers 404 for a malformed id', async () => {
    await expect(
      deleteRecord(modelReturning(null), '1', 'missing'),
    ).rejects.toThrow(NotFoundException);
  });
});
