import type { RasaEvent } from '../training/rasa/rasa.client';

export interface IntentScore {
  name: string;
  confidence: number;
}

export interface ExtractedEntity {
  entity: string;
  value: unknown;
  start: number | null;
  end: number | null;
  confidence: number | null;
  extractor: string | null;
  role: string | null;
  group: string | null;
}

export interface PredictedAction {
  name: string;
  /** Policy that chose the action, e.g. RulePolicy or TEDPolicy. */
  policy: string | null;
  confidence: number | null;
}

export interface SlotChange {
  name: string;
  value: unknown;
}

/** What Rasa understood from one user message and what it did about it. */
export interface ChatTurn {
  text: string;
  messageId: string | null;
  timestamp: number | null;
  intent: IntentScore | null;
  intentRanking: IntentScore[];
  entities: ExtractedEntity[];
  actions: PredictedAction[];
  slots: SlotChange[];
}

/** The graph names policies after their position, e.g. policy_1_RulePolicy. */
function policyName(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  return value.replace(/^policy_\d+_/, '');
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function toIntentScore(value: any): IntentScore | null {
  if (!value || typeof value.name !== 'string') return null;
  return { name: value.name, confidence: numberOrNull(value.confidence) ?? 0 };
}

function toEntity(value: any): ExtractedEntity {
  return {
    entity: String(value?.entity ?? ''),
    value: value?.value ?? null,
    start: numberOrNull(value?.start),
    end: numberOrNull(value?.end),
    confidence: numberOrNull(value?.confidence_entity),
    extractor: stringOrNull(value?.extractor),
    role: stringOrNull(value?.role),
    group: stringOrNull(value?.group),
  };
}

function userTurn(event: RasaEvent): ChatTurn {
  const parse = (event.parse_data ?? {}) as any;
  const ranking = Array.isArray(parse.intent_ranking)
    ? parse.intent_ranking.map(toIntentScore).filter(Boolean)
    : [];
  return {
    text: String(event.text ?? parse.text ?? ''),
    messageId: stringOrNull(event.message_id ?? parse.message_id),
    timestamp: numberOrNull(event.timestamp),
    intent: toIntentScore(parse.intent),
    intentRanking: ranking,
    entities: Array.isArray(parse.entities) ? parse.entities.map(toEntity) : [],
    actions: [],
    slots: [],
  };
}

/**
 * Groups tracker events into one turn per user message: the parse result of
 * the message, then the actions and slot changes it led to, up to the next
 * user message. `action_listen` only marks the end of a turn and is left out.
 */
export function turnsFromEvents(events: RasaEvent[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  let current: ChatTurn | undefined;

  for (const event of events) {
    if (event.event === 'user') {
      current = userTurn(event);
      turns.push(current);
    } else if (!current) {
      continue;
    } else if (event.event === 'action' && event.name !== 'action_listen') {
      current.actions.push({
        name: String(event.name ?? ''),
        policy: policyName(event.policy),
        confidence: numberOrNull(event.confidence),
      });
    } else if (event.event === 'slot') {
      current.slots.push({
        name: String(event.name ?? ''),
        value: event.value,
      });
    }
  }
  return turns;
}
