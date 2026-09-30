/**
 * Normalized snapshot of the bot data stored in Mongo. The validator checks
 * this shape and the exporter turns it into the YAML Rasa trains on.
 */
export interface TrainingDataset {
  intents: string[];
  entities: string[];
  /** Custom action names from the `actions` collection. */
  actions: string[];
  slots: SlotDefinition[];
  responses: ResponseDefinition[];
  nlu: NluDefinition[];
  stories: ConversationDefinition[];
  rules: ConversationDefinition[];
}

export interface SlotMapping {
  type: string;
  entity?: string;
  intent?: string | string[];
  not_intent?: string | string[];
  value?: unknown;
  role?: string;
  group?: string;
  conditions?: unknown;
}

export interface SlotDefinition {
  name: string;
  type: string;
  mappings: SlotMapping[];
}

export interface ResponseDefinition {
  name: string;
  variants: unknown[];
}

export interface NluDefinition {
  intent: string;
  examples: string[];
}

export interface ConversationDefinition {
  name: string;
  steps: unknown[];
}

export interface TrainingDataStats {
  intents: number;
  examples: number;
  entities: number;
  slots: number;
  responses: number;
  actions: number;
  stories: number;
  rules: number;
}
