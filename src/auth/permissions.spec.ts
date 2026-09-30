import { covers, withImplied } from './permissions';

describe('withImplied', () => {
  it("adds each module's read permission to its other permissions", () => {
    expect(
      withImplied(['dialogue.write', 'train.run', 'chat_test.use']),
    ).toEqual([
      'dialogue.read',
      'dialogue.write',
      'train.read',
      'train.run',
      'chat_test.use',
    ]);
  });

  it('keeps an empty list empty', () => {
    expect(withImplied([])).toEqual([]);
  });
});

describe('covers', () => {
  it('holds when every required permission is granted', () => {
    expect(covers(['users.read', 'users.write'], ['users.write'])).toBe(true);
    expect(covers(['users.read'], ['users.read', 'users.write'])).toBe(false);
    expect(covers([], [])).toBe(true);
  });
});
