import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, isValidObjectId } from 'mongoose';
import { Observable } from 'rxjs';
import type { ValidationReport } from './data/training-data.validator';
import type { TrainingDataStats } from './data/training-data.types';
import {
  TrainJob,
  TrainJobDocument,
  TrainJobError,
  TrainLogEntry,
  TrainLogLevel,
} from './schemas/train-job.schema';
import { JobEvent, TrainEventsService } from './train-events.service';
import {
  ACTIVE_LOCK,
  ACTIVE_STATUSES,
  MAX_LOG_ENTRIES,
  TRAIN_JOB_NAME,
  TRAIN_QUEUE,
  TrainStatus,
  isTerminal,
} from './training.constants';

export interface TrainJobPayload {
  trainJobId: string;
  /** Train even when the data matches the model already running. */
  force?: boolean;
}

export type TrainStreamMessage =
  | { type: 'snapshot'; job: TrainJob & { _id: unknown } }
  | { type: 'error'; message: string }
  | { type: 'ping' }
  | JobEvent;

const ENQUEUE_TIMEOUT_MS = 5_000;
const DUPLICATE_KEY = 11000;
const JOB_LIST_PROJECTION = { logs: 0, 'validation.warnings': 0 };

@Injectable()
export class TrainJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TrainJobsService.name);

  constructor(
    @InjectModel(TrainJob.name)
    private readonly model: Model<TrainJobDocument>,
    @InjectQueue(TRAIN_QUEUE)
    private readonly queue: Queue<TrainJobPayload>,
    private readonly events: TrainEventsService,
  ) {}

  onApplicationBootstrap() {
    // Not awaited so an unreachable Redis cannot hold up startup.
    this.failOrphanedJobs().catch((error) =>
      this.logger.warn(`Không đối soát được job train: ${error}`),
    );
  }

  /** Marks jobs whose worker vanished (e.g. the server restarted mid-training) as failed. */
  private async failOrphanedJobs() {
    const pending = await this.model
      .find({ status: { $in: ACTIVE_STATUSES } }, { _id: 1, status: 1 })
      .lean();
    for (const job of pending) {
      const id = String(job._id);
      try {
        const queued = await this.queue.getJob(id);
        const state = queued ? await queued.getState() : 'missing';
        if (['missing', 'completed', 'failed', 'unknown'].includes(state)) {
          await this.fail(id, job.status, {
            message: 'Tiến trình train bị gián đoạn (server đã khởi động lại)',
          });
        }
      } catch (error) {
        this.logger.warn(`Không kiểm tra được job ${id}: ${error}`);
      }
    }
  }

  async enqueue(
    triggeredBy?: string,
    { force = false }: { force?: boolean } = {},
  ): Promise<TrainJobDocument> {
    let job: TrainJobDocument;
    try {
      // The first log entry is written with the document, before the job
      // reaches the queue, so the worker's later updates cannot be overtaken.
      const entry: TrainLogEntry = {
        seq: 1,
        at: new Date(),
        level: 'info',
        status: TrainStatus.Queued,
        message: 'Đã đưa vào hàng đợi train',
      };
      job = await this.model.create({
        status: TrainStatus.Queued,
        activeLock: ACTIVE_LOCK,
        triggeredBy,
        logSeq: 1,
        logs: [entry],
      });
    } catch (error) {
      if (error?.code === DUPLICATE_KEY) {
        const active = await this.model
          .findOne({ activeLock: ACTIVE_LOCK }, { _id: 1, status: 1 })
          .lean();
        throw new ConflictException({
          message: 'Đang có một phiên train chưa kết thúc',
          jobId: active ? String(active._id) : null,
          status: active?.status ?? null,
        });
      }
      throw error;
    }

    const id = job.id as string;
    try {
      await withTimeout(
        this.queue.add(
          TRAIN_JOB_NAME,
          { trainJobId: id, force },
          { jobId: id, removeOnComplete: 200, removeOnFail: 200 },
        ),
        ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      await this.fail(id, TrainStatus.Queued, {
        message: 'Không đưa được vào hàng đợi (Redis không phản hồi)',
      });
      throw new ServiceUnavailableException(
        'Không kết nối được hàng đợi train, vui lòng thử lại',
      );
    }

    return job;
  }

  async list(limit = 20, skip = 0) {
    const [items, total] = await Promise.all([
      this.model
        .find({}, JOB_LIST_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(),
    ]);
    return { items, total };
  }

  async findOne(id: string) {
    const job = isValidObjectId(id)
      ? await this.model.findById(id).lean()
      : null;
    if (!job) {
      throw new NotFoundException(`Không tìm thấy phiên train ${id}`);
    }
    return job;
  }

  /** Jobs that produced a model file, which are the versions that can be activated. */
  findWithModels() {
    return this.model
      .find(
        { modelFile: { $exists: true }, reusedModel: { $ne: true } },
        JOB_LIST_PROJECTION,
      )
      .sort({ createdAt: -1 })
      .lean();
  }

  /** Hash of the data a model was trained on; null for unknown or legacy models. */
  async dataHashOf(modelFile: string): Promise<string | null> {
    const job = await this.model
      .findOne({ modelFile, dataHash: { $exists: true } }, { dataHash: 1 })
      .lean();
    return job?.dataHash ?? null;
  }

  async hasModel(modelFile: string): Promise<boolean> {
    return (await this.model.countDocuments({ modelFile })) > 0;
  }

  async markActivated(modelFile: string) {
    await this.model.updateMany(
      { modelFile },
      { $set: { lastActivatedAt: new Date() } },
    );
  }

  /** The only way a job's status changes; plain log() calls never move it. */
  async transition(
    id: string,
    status: TrainStatus,
    message: string,
    extra: Partial<TrainJob> = {},
    level: TrainLogLevel = 'info',
  ) {
    await this.log(id, status, level, message, { ...extra, status });
  }

  /** Appends a log entry tagged with `status`, the stage it belongs to. */
  async log(
    id: string,
    status: TrainStatus,
    level: TrainLogLevel,
    message: string,
    extra: Partial<TrainJob> = {},
  ) {
    const counter = await this.model.findByIdAndUpdate(
      id,
      { $inc: { logSeq: 1 } },
      { new: true, projection: { logSeq: 1 } },
    );
    if (!counter) return;

    const entry: TrainLogEntry = {
      seq: counter.logSeq,
      at: new Date(),
      level,
      status,
      message,
    };
    const set = omitUndefined(extra);
    await this.model.updateOne(
      { _id: id },
      {
        ...(Object.keys(set).length > 0 && { $set: set }),
        $push: { logs: { $each: [entry], $slice: -MAX_LOG_ENTRIES } },
      },
    );
    await this.events.publish({
      type: 'log',
      jobId: id,
      entry,
      ...(set.status && { status: set.status }),
    });
  }

  async recordValidation(
    id: string,
    validation: ValidationReport,
    stats: TrainingDataStats,
  ) {
    await this.model.updateOne({ _id: id }, { $set: { validation, stats } });
    await this.events.publish({ type: 'validation', jobId: id, validation });
  }

  async complete(id: string, modelFile: string, startedAt: Date) {
    const finishedAt = new Date();
    await this.transition(
      id,
      TrainStatus.Loaded,
      `Model ${modelFile} đã được nạp và đang chạy`,
      {
        modelFile,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        lastActivatedAt: finishedAt,
      },
    );
    await this.release(id);
    await this.events.publish({
      type: 'model.activated',
      modelFile,
      at: finishedAt.toISOString(),
    });
    await this.events.publish({
      type: 'done',
      jobId: id,
      status: TrainStatus.Loaded,
    });
  }

  /** Finishes a job whose data matches the running model, without training. */
  async completeUnchanged(
    id: string,
    modelFile: string,
    dataHash: string,
    startedAt: Date,
  ) {
    const finishedAt = new Date();
    await this.transition(
      id,
      TrainStatus.Loaded,
      `Dữ liệu không thay đổi so với model đang chạy ${modelFile}, bỏ qua train`,
      {
        modelFile,
        reusedModel: true,
        dataHash,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
    );
    await this.release(id);
    await this.events.publish({
      type: 'done',
      jobId: id,
      status: TrainStatus.Loaded,
    });
  }

  async fail(
    id: string,
    stage: TrainStatus,
    error: Omit<TrainJobError, 'stage'>,
    startedAt?: Date,
  ) {
    const current = await this.model.findById(id, { status: 1 }).lean();
    if (!current || isTerminal(current.status)) return;

    const finishedAt = new Date();
    await this.transition(
      id,
      TrainStatus.Failed,
      error.message,
      {
        error: { ...error, stage },
        finishedAt,
        durationMs: startedAt
          ? finishedAt.getTime() - startedAt.getTime()
          : undefined,
      },
      'error',
    );
    await this.release(id);
    await this.events.publish({
      type: 'done',
      jobId: id,
      status: TrainStatus.Failed,
    });
  }

  /**
   * Snapshot of the job followed by its live events, completing once the job
   * finishes. Live events are buffered while the snapshot loads so nothing
   * published in between is lost; entries already in the snapshot are dropped.
   */
  watch(id: string): Observable<TrainStreamMessage> {
    return new Observable<TrainStreamMessage>((subscriber) => {
      let lastSeq: number | null = null;
      const buffer: JobEvent[] = [];

      const emit = (event: JobEvent) => {
        if (event.type === 'log' && event.entry.seq <= lastSeq) return;
        subscriber.next(event);
        if (event.type === 'done') subscriber.complete();
      };

      const live = this.events.forJob(id).subscribe((event) => {
        if (lastSeq === null) buffer.push(event);
        else emit(event);
      });

      this.findOne(id)
        .then((job) => {
          subscriber.next({ type: 'snapshot', job });
          lastSeq = job.logSeq ?? 0;
          if (isTerminal(job.status)) {
            subscriber.complete();
            return;
          }
          buffer.splice(0).forEach(emit);
        })
        .catch((error) => {
          subscriber.next({ type: 'error', message: error.message });
          subscriber.complete();
        });

      return () => live.unsubscribe();
    });
  }

  private async release(id: string) {
    await this.model.updateOne({ _id: id }, { $unset: { activeLock: 1 } });
  }
}

function omitUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
