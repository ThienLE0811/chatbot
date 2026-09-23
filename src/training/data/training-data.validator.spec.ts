import { TrainingDataValidator } from './training-data.validator';
import { TrainingDataset } from './training-data.types';

function dataset(overrides: Partial<TrainingDataset> = {}): TrainingDataset {
  return {
    intents: ['greet', 'goodbye'],
    entities: ['city'],
    actions: [],
    slots: [
      {
        name: 'city',
        type: 'text',
        mappings: [{ type: 'from_entity', entity: 'city' }],
      },
    ],
    responses: [
      { name: 'utter_greet', variants: [{ text: 'Xin chào' }] },
      { name: 'utter_goodbye', variants: [{ text: 'Tạm biệt' }] },
    ],
    nlu: [
      { intent: 'greet', examples: ['xin chào', 'chào bạn'] },
      {
        intent: 'goodbye',
        examples: ['tạm biệt', 'bye', 'tôi ở [Hà Nội](city)'],
      },
    ],
    stories: [
      {
        name: 'chào hỏi',
        steps: [{ intent: 'greet' }, { action: 'utter_greet' }],
      },
    ],
    rules: [
      {
        name: 'tạm biệt',
        steps: [{ intent: 'goodbye' }, { action: 'utter_goodbye' }],
      },
    ],
    ...overrides,
  };
}

function codes(issues: { code: string }[]) {
  return issues.map((issue) => issue.code);
}

describe('TrainingDataValidator', () => {
  const validator = new TrainingDataValidator();

  it('accepts a consistent dataset without issues', () => {
    const report = validator.validate(dataset());

    expect(report).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('requires at least two intents with examples', () => {
    const report = validator.validate(
      dataset({
        nlu: [
          { intent: 'greet', examples: ['xin chào', 'chào bạn'] },
          { intent: 'goodbye', examples: [] },
        ],
      }),
    );

    expect(report.valid).toBe(false);
    expect(codes(report.errors)).toEqual(
      expect.arrayContaining(['NLU_NO_EXAMPLES', 'NLU_TOO_FEW_INTENTS']),
    );
  });

  it('blocks stories that reference undefined intents, actions or slots', () => {
    const report = validator.validate(
      dataset({
        stories: [
          {
            name: 'hỏng',
            steps: [
              { intent: 'order_pizza' },
              { action: 'utter_missing' },
              { action: '' },
              { slot_was_set: [{ size: 'large' }] },
            ],
          },
        ],
      }),
    );

    expect(codes(report.errors)).toEqual([
      'STEP_UNKNOWN_INTENT',
      'STEP_UNKNOWN_ACTION',
      'STEP_EMPTY_ACTION',
      'STEP_UNKNOWN_SLOT',
    ]);
    expect(report.errors[0].path).toBe('stories.hỏng.steps[0]');
  });

  it('accepts default Rasa actions and custom actions from the actions collection', () => {
    const report = validator.validate(
      dataset({
        actions: ['action_check_weather'],
        rules: [
          {
            name: 'thời tiết',
            steps: [
              { intent: 'greet' },
              { action: 'action_check_weather' },
              { action: 'action_listen' },
            ],
          },
        ],
      }),
    );

    expect(report.errors).toEqual([]);
  });

  it('rejects duplicate story names and stories without steps', () => {
    const story = { name: 'lặp', steps: [{ intent: 'greet' }] };
    const report = validator.validate(
      dataset({ stories: [story, story, { name: 'rỗng', steps: [] }] }),
    );

    expect(codes(report.errors)).toEqual([
      'DUPLICATE_NAME',
      'CONVERSATION_NO_STEPS',
    ]);
  });

  it('rejects empty responses and invalid slot definitions', () => {
    const report = validator.validate(
      dataset({
        responses: [
          { name: 'utter_greet', variants: [{ text: '   ' }] },
          { name: 'utter_goodbye', variants: [] },
        ],
        slots: [
          { name: 'size', type: 'number', mappings: [{ type: 'from_entity' }] },
          {
            name: 'city',
            type: 'text',
            mappings: [{ type: 'from_entity', entity: 'town' }],
          },
        ],
      }),
    );

    expect(codes(report.errors)).toEqual([
      'RESPONSE_INVALID_VARIANT',
      'RESPONSE_EMPTY',
      'SLOT_INVALID_TYPE',
      'SLOT_MAPPING_NO_ENTITY',
      'SLOT_MAPPING_UNKNOWN_ENTITY',
    ]);
  });

  it('only warns about quality problems that Rasa can still train on', () => {
    const report = validator.validate(
      dataset({
        intents: ['greet', 'goodbye', 'unused'],
        nlu: [
          { intent: 'greet', examples: ['xin chào', 'Xin  chào', 'bye'] },
          { intent: 'goodbye', examples: ['bye', 'đi [Huế](place)'] },
          { intent: 'thanks', examples: ['cảm ơn'] },
        ],
        responses: [
          { name: 'greet_reply', variants: [{ text: 'Xin chào' }] },
          { name: 'utter_greet', variants: [{ text: 'Xin chào' }] },
          { name: 'utter_goodbye', variants: [{ text: 'Tạm biệt' }] },
        ],
      }),
    );

    expect(report.valid).toBe(true);
    expect(codes(report.warnings).sort()).toEqual(
      [
        'INTENT_WITHOUT_EXAMPLES',
        'NLU_DUPLICATE_EXAMPLE',
        'NLU_EXAMPLE_IN_MULTIPLE_INTENTS',
        'NLU_FEW_EXAMPLES',
        'NLU_INTENT_NOT_IN_DOMAIN',
        'NLU_UNKNOWN_ENTITY',
        'RESPONSE_NAME_PREFIX',
      ].sort(),
    );
  });
});
