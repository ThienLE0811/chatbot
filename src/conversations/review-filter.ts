import type { FilterQuery } from 'mongoose';
import type { ConversationMessage } from './schemas/conversation-message.schema';

export const FALLBACK_INTENT = 'nlu_fallback';
/** User messages Rasa was less sure about than this are worth a look. */
export const DEFAULT_LOW_CONFIDENCE = 0.6;

export type ReviewReason = 'flagged' | 'fallback' | 'low_confidence';

/**
 * User messages a designer should look at: flagged as misunderstood, sent to
 * fallback, or recognised with low confidence. Button payloads and commands
 * (texts starting with "/") are skipped, and so are messages already added
 * to an intent or ignored.
 */
export function needsReviewFilter(
  maxConfidence = DEFAULT_LOW_CONFIDENCE,
): FilterQuery<ConversationMessage> {
  return {
    from: 'user',
    text: { $exists: true, $not: /^\s*\// },
    'review.status': { $nin: ['added', 'ignored'] },
    $or: [
      { 'review.status': 'wrong' },
      { 'intent.name': FALLBACK_INTENT },
      { 'intent.confidence': { $lt: maxConfidence } },
    ],
  };
}

/** Why a message matched needsReviewFilter; a flag set by a person comes first. */
export function reviewReason(
  message: Pick<ConversationMessage, 'intent' | 'review'>,
): ReviewReason {
  if (message.review?.status === 'wrong') return 'flagged';
  if (message.intent?.name === FALLBACK_INTENT) return 'fallback';
  return 'low_confidence';
}
