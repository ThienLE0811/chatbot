import {
  cleanExamples,
  describeConflicts,
  findConflicts,
  mergeExamples,
} from './intent-examples';

describe('cleanExamples', () => {
  it('trims, drops blanks and non-strings, and keeps the first of repeats', () => {
    expect(
      cleanExamples([' xin chào ', '', '   ', 'Xin Chào', 42, 'hello']),
    ).toEqual(['xin chào', 'hello']);
  });
});

describe('mergeExamples', () => {
  it('appends only the examples not already present', () => {
    expect(mergeExamples(['a', 'b'], ['B', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('findConflicts', () => {
  const others = [
    { intent: 'greet', examples: ['Xin chào', 'hello'] },
    { intent: 'goodbye' },
  ];

  it('finds examples another intent already has, ignoring case', () => {
    expect(findConflicts(['xin chào', 'khoan đã'], others)).toEqual([
      { example: 'xin chào', intent: 'greet' },
    ]);
  });

  it('finds nothing when every example is new', () => {
    expect(findConflicts(['khoan đã'], others)).toEqual([]);
  });
});

describe('describeConflicts', () => {
  it('names the first three and counts the rest', () => {
    const conflicts = ['a', 'b', 'c', 'd', 'e'].map((example) => ({
      example,
      intent: 'greet',
    }));
    expect(describeConflicts(conflicts)).toBe(
      'Câu mẫu đã thuộc ý định khác: "a" (ý định "greet"), ' +
        '"b" (ý định "greet"), "c" (ý định "greet") và 2 câu khác',
    );
  });
});
