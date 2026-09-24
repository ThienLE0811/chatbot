import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Connection } from 'mongoose';
import * as YAML from 'yaml';
import {
  SlotMapping,
  TrainingDataset,
  TrainingDataStats,
} from './training-data.types';

const SLOT_MAPPING_KEYS: (keyof SlotMapping)[] = [
  'type',
  'entity',
  'intent',
  'not_intent',
  'value',
  'role',
  'group',
  'conditions',
];

export interface ExportedTrainingData {
  yaml: string;
  hash: string;
  stats: TrainingDataStats;
}

/** Collections the training data is read from. */
export const TRAINING_COLLECTIONS = [
  'intents',
  'entities',
  'actions',
  'slots',
  'responses',
  'nlu',
  'stories',
  'rules',
] as const;

export type TrainingCollection = (typeof TRAINING_COLLECTIONS)[number];

/** Raw Mongo documents of every training collection. */
export type TrainingDocuments = Record<
  TrainingCollection,
  Record<string, any>[]
>;

/**
 * Reads the bot collections and builds the combined domain + NLU + stories
 * YAML accepted by Rasa's POST /model/train.
 *
 * Collections are read from an explicit list: the old export took every
 * collection except a denylist, which leaked unrelated data (train history,
 * train jobs) into the payload sent to Rasa.
 */
@Injectable()
export class TrainingDataExporter {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async load(): Promise<TrainingDataset> {
    const entries = await Promise.all(
      TRAINING_COLLECTIONS.map(
        async (name) => [name, await this.read(name)] as const,
      ),
    );
    return toTrainingDataset(Object.fromEntries(entries) as TrainingDocuments);
  }

  toRasaYaml(dataset: TrainingDataset): string {
    const payload: Record<string, unknown> = {
      intents: dataset.intents,
      entities: dataset.entities,
      slots: Object.fromEntries(
        dataset.slots.map((slot) => [
          slot.name,
          { type: slot.type, mappings: slot.mappings },
        ]),
      ),
      responses: Object.fromEntries(
        dataset.responses.map((response) => [response.name, response.variants]),
      ),
      forms: {},
      nlu: dataset.nlu.map((item) => ({
        intent: item.intent,
        examples: item.examples.map((example) => `- ${example}\n`).join(''),
      })),
      stories: dataset.stories.map((story) => ({
        story: story.name,
        steps: story.steps,
      })),
      rules: dataset.rules.map((rule) => ({
        rule: rule.name,
        steps: rule.steps,
      })),
    };
    if (dataset.actions.length > 0) {
      payload.actions = dataset.actions;
    }

    return YAML.stringify(payload, { indent: 2, lineWidth: -1 });
  }

  export(dataset: TrainingDataset): ExportedTrainingData {
    const yaml = this.toRasaYaml(dataset);
    return {
      yaml,
      hash: createHash('sha256').update(yaml).digest('hex'),
      stats: computeStats(dataset),
    };
  }

  private read(collection: string): Promise<Record<string, any>[]> {
    return this.connection
      .collection(collection)
      .find({}, { projection: { _id: 0, __v: 0 } })
      .toArray();
  }
}

/** Normalizes raw Mongo documents into the dataset the validator checks. */
export function toTrainingDataset(docs: TrainingDocuments): TrainingDataset {
  return {
    intents: docs.intents.map((doc) => text(doc.title)),
    entities: docs.entities.map((doc) => text(doc.nameEntities)),
    actions: unique(
      docs.actions
        .map((doc) => text(doc.action).replace(/^action:\s*/, ''))
        .filter(Boolean),
    ),
    slots: docs.slots.map((doc) => ({
      name: text(doc.nameSlot),
      type: text(doc.type),
      mappings: asArray(doc.mapping).map(pickSlotMapping),
    })),
    responses: docs.responses.map((doc) => ({
      name: text(doc.title),
      variants: asArray(doc.data),
    })),
    nlu: docs.nlu.map((doc) => ({
      intent: text(doc.intent),
      examples: asArray(doc.examples).map(text),
    })),
    stories: docs.stories.map((doc) => ({
      name: text(doc.story),
      steps: asArray(doc.steps),
    })),
    rules: docs.rules.map((doc) => ({
      name: text(doc.rule),
      steps: asArray(doc.steps),
    })),
  };
}

export function computeStats(dataset: TrainingDataset): TrainingDataStats {
  return {
    intents: dataset.intents.length,
    examples: dataset.nlu.reduce((sum, item) => sum + item.examples.length, 0),
    entities: dataset.entities.length,
    slots: dataset.slots.length,
    responses: dataset.responses.length,
    actions: dataset.actions.length,
    stories: dataset.stories.length,
    rules: dataset.rules.length,
  };
}

function pickSlotMapping(raw: any): SlotMapping {
  const mapping: Record<string, unknown> = {};
  for (const key of SLOT_MAPPING_KEYS) {
    if (raw?.[key] !== undefined && raw?.[key] !== null && raw?.[key] !== '') {
      mapping[key] = raw[key];
    }
  }
  return mapping as unknown as SlotMapping;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
