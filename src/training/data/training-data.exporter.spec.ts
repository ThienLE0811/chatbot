import * as YAML from 'yaml';
import { TrainingDataExporter } from './training-data.exporter';

function fakeConnection(collections: Record<string, Record<string, any>[]>) {
  return {
    collection: (name: string) => ({
      find: () => ({ toArray: async () => collections[name] ?? [] }),
    }),
  } as any;
}

describe('TrainingDataExporter', () => {
  const exporter = new TrainingDataExporter(
    fakeConnection({
      intents: [{ title: 'greet' }, { title: 'goodbye' }],
      entities: [{ nameEntities: 'city', dataEntities: [] }],
      actions: [
        { action: 'action: action_weather' },
        { action: 'action_weather' },
      ],
      slots: [
        {
          nameSlot: 'city',
          type: 'text',
          mapping: [
            { type: 'from_entity', entity: 'city', _id: 'x', extra: 1 },
          ],
        },
      ],
      responses: [{ title: 'utter_greet', data: [{ text: 'Xin chào' }] }],
      nlu: [{ intent: 'greet', examples: [' xin chào ', 'chào bạn'] }],
      stories: [
        { story: 'chào', steps: [{ intent: 'greet' }], description: 'bỏ qua' },
      ],
      rules: [{ rule: 'r1', steps: [{ action: 'utter_greet' }] }],
      // Collections outside the explicit list must never reach Rasa.
      histories: [{ name: 'old.tar.gz' }],
      train_jobs: [{ status: 'loaded' }],
    }),
  );

  it('builds the Rasa training payload from the bot collections only', async () => {
    const dataset = await exporter.load();
    const payload = YAML.parse(exporter.toRasaYaml(dataset));

    expect(payload).toEqual({
      intents: ['greet', 'goodbye'],
      entities: ['city'],
      actions: ['action_weather'],
      slots: {
        city: {
          type: 'text',
          mappings: [{ type: 'from_entity', entity: 'city' }],
        },
      },
      responses: { utter_greet: [{ text: 'Xin chào' }] },
      forms: {},
      nlu: [{ intent: 'greet', examples: '- xin chào\n- chào bạn\n' }],
      stories: [{ story: 'chào', steps: [{ intent: 'greet' }] }],
      rules: [{ rule: 'r1', steps: [{ action: 'utter_greet' }] }],
    });
  });

  it('hashes identical data identically and reports counts', async () => {
    const dataset = await exporter.load();
    const first = exporter.export(dataset);
    const second = exporter.export(await exporter.load());

    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(second.hash).toBe(first.hash);
    expect(first.stats).toEqual({
      intents: 2,
      examples: 2,
      entities: 1,
      slots: 1,
      responses: 1,
      actions: 1,
      stories: 1,
      rules: 1,
    });
  });
});
