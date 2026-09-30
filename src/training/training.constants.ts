export const TRAIN_QUEUE = 'rasa-train';
export const TRAIN_JOB_NAME = 'train';

/** Only one training may be queued or running at a time; see TrainJob.activeLock. */
export const ACTIVE_LOCK = 'rasa-train';

/** Cap per-job log entries so a long training cannot grow the document without bound. */
export const MAX_LOG_ENTRIES = 500;

export enum TrainStatus {
  Queued = 'queued',
  Validating = 'validating',
  Training = 'training',
  Loading = 'loading',
  Loaded = 'loaded',
  Failed = 'failed',
}

export const TERMINAL_STATUSES: readonly TrainStatus[] = [
  TrainStatus.Loaded,
  TrainStatus.Failed,
];

export const ACTIVE_STATUSES: readonly TrainStatus[] = [
  TrainStatus.Queued,
  TrainStatus.Validating,
  TrainStatus.Training,
  TrainStatus.Loading,
];

export function isTerminal(status: TrainStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
