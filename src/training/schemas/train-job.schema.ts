import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { TrainStatus } from '../training.constants';
import type { ValidationReport } from '../data/training-data.validator';
import type { TrainingDataStats } from '../data/training-data.types';

export type TrainLogLevel = 'info' | 'warn' | 'error';

export interface TrainLogEntry {
  seq: number;
  at: Date;
  level: TrainLogLevel;
  status: TrainStatus;
  message: string;
}

export interface TrainJobError {
  message: string;
  stage: TrainStatus;
  details?: unknown;
}

export type TrainJobDocument = HydratedDocument<TrainJob>;

@Schema({ collection: 'train_jobs', timestamps: true })
export class TrainJob {
  @Prop({
    type: String,
    enum: Object.values(TrainStatus),
    required: true,
    index: true,
  })
  status: TrainStatus;

  /**
   * Set while the job is queued or running and unset once it finishes. The
   * unique sparse index turns "only one training at a time" into a database
   * guarantee instead of a check-then-insert race.
   */
  @Prop({ type: String, unique: true, sparse: true })
  activeLock?: string;

  @Prop({ type: Number, default: 0 })
  logSeq: number;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  logs: TrainLogEntry[];

  @Prop({ type: SchemaTypes.Mixed })
  validation?: ValidationReport;

  @Prop({ type: SchemaTypes.Mixed })
  stats?: TrainingDataStats;

  /** sha256 of the YAML sent to Rasa, to tell which data a model was trained on. */
  @Prop()
  dataHash?: string;

  /** File name Rasa gave the model, e.g. 20260923-101500-brave-lake.tar.gz */
  @Prop({ index: true })
  modelFile?: string;

  @Prop({ type: SchemaTypes.Mixed })
  error?: TrainJobError;

  @Prop()
  triggeredBy?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop()
  durationMs?: number;

  @Prop()
  lastActivatedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TrainJobSchema = SchemaFactory.createForClass(TrainJob);
TrainJobSchema.index({ createdAt: -1 });
