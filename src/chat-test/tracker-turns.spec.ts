import type { RasaEvent } from '../training/rasa/rasa.client';
import { turnsFromEvents } from './tracker-turns';

/** Events as Rasa 3.6 writes them for a greeting followed by a question. */
const events: RasaEvent[] = [
  {
    event: 'action',
    name: 'action_session_start',
    policy: null,
    confidence: 1,
  },
  { event: 'session_started' },
  { event: 'action', name: 'action_listen', policy: null, confidence: null },
  {
    event: 'user',
    timestamp: 1727150000.5,
    text: 'xin chào',
    message_id: 'm1',
    parse_data: {
      intent: { name: 'chao_hoi', confidence: 0.97 },
      entities: [],
      intent_ranking: [
        { name: 'chao_hoi', confidence: 0.97 },
        { name: 'tam_biet', confidence: 0.02 },
      ],
      text: 'xin chào',
    },
  },
  { event: 'user_featurization', use_text_for_featurization: false },
  {
    event: 'action',
    name: 'utter_chao_hoi',
    policy: 'policy_1_RulePolicy',
    confidence: 1,
  },
  {
    event: 'bot',
    text: 'Chào bạn!',
    metadata: { utter_action: 'utter_chao_hoi' },
  },
  {
    event: 'action',
    name: 'action_listen',
    policy: 'policy_1_RulePolicy',
    confidence: 1,
  },
  {
    event: 'user',
    text: 'học phí ngành CNTT',
    parse_data: {
      intent: { name: 'hoi_hoc_phi', confidence: 0.61 },
      entities: [
        {
          entity: 'nganh',
          value: 'CNTT',
          start: 12,
          end: 16,
          confidence_entity: 0.93,
          extractor: 'DIETClassifier',
        },
      ],
      intent_ranking: [{ name: 'hoi_hoc_phi', confidence: 0.61 }],
    },
  },
  { event: 'slot', name: 'nganh', value: 'CNTT' },
  {
    event: 'action',
    name: 'utter_hoc_phi',
    policy: 'policy_3_TEDPolicy',
    confidence: 0.88,
  },
];

describe('turnsFromEvents', () => {
  it('makes one turn per user message, ignoring events before the first one', () => {
    const turns = turnsFromEvents(events);

    expect(turns.map((turn) => turn.text)).toEqual([
      'xin chào',
      'học phí ngành CNTT',
    ]);
  });

  it('keeps the parse result of each message', () => {
    const [greeting] = turnsFromEvents(events);

    expect(greeting).toMatchObject({
      messageId: 'm1',
      timestamp: 1727150000.5,
      intent: { name: 'chao_hoi', confidence: 0.97 },
      intentRanking: [
        { name: 'chao_hoi', confidence: 0.97 },
        { name: 'tam_biet', confidence: 0.02 },
      ],
      entities: [],
    });
  });

  it('lists the actions each message led to, without action_listen', () => {
    const [greeting, question] = turnsFromEvents(events);

    expect(greeting.actions).toEqual([
      { name: 'utter_chao_hoi', policy: 'RulePolicy', confidence: 1 },
    ]);
    expect(question.actions).toEqual([
      { name: 'utter_hoc_phi', policy: 'TEDPolicy', confidence: 0.88 },
    ]);
  });

  it('keeps extracted entities and the slots they set', () => {
    const [, question] = turnsFromEvents(events);

    expect(question.entities).toEqual([
      {
        entity: 'nganh',
        value: 'CNTT',
        start: 12,
        end: 16,
        confidence: 0.93,
        extractor: 'DIETClassifier',
        role: null,
        group: null,
      },
    ]);
    expect(question.slots).toEqual([{ name: 'nganh', value: 'CNTT' }]);
  });

  it('tolerates a user event without parse data', () => {
    const [turn] = turnsFromEvents([{ event: 'user', text: 'hi' }]);

    expect(turn).toMatchObject({
      text: 'hi',
      intent: null,
      intentRanking: [],
      entities: [],
    });
  });
});
