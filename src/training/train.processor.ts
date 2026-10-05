import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { BeforeApplicationShutdown, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { TrainingDataExporter } from './data/training-data.exporter';
import { TrainingDataValidator } from './data/training-data.validator';
import { RasaClient, RasaError, modelFileName } from './rasa/rasa.client';
import { TrainJobPayload, TrainJobsService } from './train-jobs.service';
import { TRAIN_QUEUE, TrainStatus, isTerminal } from './training.constants';

const HEARTBEAT_MS = 15_000;
const MAX_LOGGED_ISSUES = 20;

/** Failure that already carries a user-facing message and details. */
class TrainingAborted extends Error {
  constructor(message: string, readonly details?: unknown) {
    super(message);
  }
}

/**
 * Runs one training at a time: validate the data, train it in Rasa, then load
 * the new model. Progress is written to the TrainJob document and published
 * as events, so the API only has to read and relay it.
 */
// maxStalledCount 0: if the process dies mid-training the job fails instead of
// silently re-sending the data to a Rasa that may still be training it.
@Processor(TRAIN_QUEUE, { concurrency: 1, maxStalledCount: 0 })
export class TrainProcessor
  extends WorkerHost
  implements BeforeApplicationShutdown
{
  private readonly logger = new Logger(TrainProcessor.name);
  private running?: { id: string; stage: TrainStatus; startedAt: Date };

  constructor(
    private readonly jobs: TrainJobsService,
    private readonly exporter: TrainingDataExporter,
    private readonly validator: TrainingDataValidator,
    private readonly rasa: RasaClient,
  ) {
    super();
  }

  async process(job: Job<TrainJobPayload>): Promise<{ modelFile: string }> {
    const id = job.data.trainJobId;
    const current = await this.jobs.findOne(id).catch(() => null);
    if (!current || isTerminal(current.status)) {
      // E.g. enqueueing timed out and the job was already marked failed.
      throw new UnrecoverableError(`Train job ${id} is no longer pending`);
    }

    const startedAt = new Date();
    // Kept on the instance so a shutdown knows which job it interrupts.
    const run = { id, stage: TrainStatus.Validating, startedAt };
    this.running = run;
    try {
      await this.jobs.transition(id, run.stage, 'Bắt đầu kiểm tra dữ liệu', {
        startedAt,
      });
      const dataset = await this.exporter.load();
      const report = this.validator.validate(dataset);
      const exported = this.exporter.export(dataset);
      await this.jobs.recordValidation(id, report, exported.stats);

      for (const issue of report.warnings.slice(0, MAX_LOGGED_ISSUES)) {
        await this.jobs.log(
          id,
          run.stage,
          'warn',
          `${issue.path}: ${issue.message}`,
        );
      }
      if (!report.valid) {
        for (const issue of report.errors.slice(0, MAX_LOGGED_ISSUES)) {
          await this.jobs.log(
            id,
            run.stage,
            'error',
            `${issue.path}: ${issue.message}`,
          );
        }
        throw new TrainingAborted(
          `Dữ liệu chưa hợp lệ: ${report.errors.length} lỗi, ${report.warnings.length} cảnh báo`,
          { errors: report.errors.length, warnings: report.warnings.length },
        );
      }
      await this.jobs.log(
        id,
        run.stage,
        'info',
        `Dữ liệu hợp lệ: ${exported.stats.intents} ý định, ${exported.stats.examples} câu mẫu, ` +
          `${exported.stats.stories} story, ${exported.stats.rules} rule, ${report.warnings.length} cảnh báo`,
      );

      const activeModel = modelFileName((await this.rasa.status()).model_file);
      await this.jobs.log(
        id,
        run.stage,
        'info',
        `Kết nối Rasa thành công, model đang chạy: ${activeModel ?? 'chưa có'}`,
      );

      if (
        !job.data.force &&
        activeModel &&
        (await this.jobs.dataHashOf(activeModel)) === exported.hash
      ) {
        await this.jobs.completeUnchanged(
          id,
          activeModel,
          exported.hash,
          startedAt,
        );
        return { modelFile: activeModel };
      }

      run.stage = TrainStatus.Training;
      await this.jobs.transition(
        id,
        run.stage,
        `Gửi dữ liệu sang Rasa để train (${Buffer.byteLength(
          exported.yaml,
        )} bytes)`,
        { dataHash: exported.hash },
      );
      const { modelFile } = await this.withHeartbeat(id, run.stage, () =>
        this.rasa.train(exported.yaml),
      );

      run.stage = TrainStatus.Loading;
      await this.jobs.transition(
        id,
        run.stage,
        `Rasa đã train xong model ${modelFile}, đang nạp model`,
        { modelFile },
      );
      await this.rasa.loadModel(modelFile);

      await this.jobs.complete(id, modelFile, startedAt);
      return { modelFile };
    } catch (error) {
      const details =
        error instanceof TrainingAborted || error instanceof RasaError
          ? error.details
          : undefined;
      await this.jobs.fail(
        id,
        run.stage,
        { message: error?.message ?? String(error), details },
        startedAt,
      );
      if (!(error instanceof TrainingAborted || error instanceof RasaError)) {
        this.logger.error(`Train job ${id} failed`, error?.stack);
      }
      // A training is expensive and not idempotent, so it is never retried automatically.
      throw new UnrecoverableError(error?.message ?? String(error));
    } finally {
      this.running = undefined;
    }
  }

  /**
   * Closing the worker normally waits for the running job, and a training can
   * take an hour: shutting down would hang until it ends or the platform
   * kills the process. Fail the job with a clear reason and stop at once
   * instead. Runs before Mongo is disconnected, so the job can be saved.
   */
  async beforeApplicationShutdown() {
    const run = this.running;
    if (run) {
      await this.jobs
        .fail(
          run.id,
          run.stage,
          {
            message:
              'Server tắt khi đang train nên job bị dừng, model mới không được nạp. Hãy train lại.',
          },
          run.startedAt,
        )
        .catch((err) =>
          this.logger.warn(`Không cập nhật được job ${run.id}: ${err}`),
        );
    }
    // Forced: do not wait for the job; its lock simply expires in Redis.
    await this.worker.close(true);
  }

  /** Covers failures that bypass process(), such as a job stalling past its limit. */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<TrainJobPayload> | undefined, error: Error) {
    if (!job) return;
    await this.jobs
      .fail(job.data.trainJobId, TrainStatus.Training, {
        message: `Tiến trình train bị dừng: ${
          error?.message ?? job.failedReason
        }`,
      })
      .catch((err) => this.logger.warn(`Không cập nhật được job lỗi: ${err}`));
  }

  /** Rasa reports nothing while training, so log elapsed time to show it is alive. */
  private async withHeartbeat<T>(
    id: string,
    stage: TrainStatus,
    work: () => Promise<T>,
  ): Promise<T> {
    const started = Date.now();
    const timer = setInterval(() => {
      const seconds = Math.round((Date.now() - started) / 1000);
      this.jobs
        .log(id, stage, 'info', `Rasa đang train… ${formatDuration(seconds)}`)
        .catch(() => undefined);
    }, HEARTBEAT_MS);
    try {
      return await work();
    } finally {
      clearInterval(timer);
    }
  }
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} phút ${seconds} giây` : `${seconds} giây`;
}
