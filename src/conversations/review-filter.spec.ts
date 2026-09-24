import {
  FALLBACK_INTENT,
  needsReviewFilter,
  reviewReason,
} from './review-filter';

describe('needsReviewFilter', () => {
  it('selects flagged, fallback and low-confidence user messages', () => {
    expect(needsReviewFilter(0.5)).toEqual({
      from: 'user',
      text: { $exists: true, $not: /^\s*\// },
      'review.status': { $nin: ['added', 'ignored'] },
      $or: [
        { 'review.status': 'wrong' },
        { 'intent.name': FALLBACK_INTENT },
        { 'intent.confidence': { $lt: 0.5 } },
      ],
    });
  });

  it('skips button payloads and commands', () => {
    const { text } = needsReviewFilter() as { text: { $not: RegExp } };

    expect(text.$not.test('/affirm')).toBe(true);
    expect(text.$not.test(' /start')).toBe(true);
    expect(text.$not.test('học phí 1/2 năm')).toBe(false);
  });
});

describe('reviewReason', () => {
  it('puts a person’s flag first', () => {
    expect(
      reviewReason({
        intent: { name: FALLBACK_INTENT, confidence: 0.3 },
        review: { status: 'wrong', at: new Date() },
      }),
    ).toBe('flagged');
  });

  it('tells fallback from low confidence', () => {
    expect(
      reviewReason({ intent: { name: FALLBACK_INTENT, confidence: 0.3 } }),
    ).toBe('fallback');
    expect(reviewReason({ intent: { name: 'greet', confidence: 0.4 } })).toBe(
      'low_confidence',
    );
  });
});
