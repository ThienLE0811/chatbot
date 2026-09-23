import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Observable, Subject, filter } from 'rxjs';
import { redisOptionsFromConfig } from './redis.config';
import { TrainStatus } from './training.constants';
import type { TrainLogEntry } from './schemas/train-job.schema';
import type { ValidationReport } from './data/training-data.validator';

const CHANNEL = 'rasa-train:events';

export type TrainEvent =
  /** `status` is present only when this entry moved the job to a new status. */
  | { type: 'log'; jobId: string; entry: TrainLogEntry; status?: TrainStatus }
  | { type: 'validation'; jobId: string; validation: ValidationReport }
  | { type: 'done'; jobId: string; status: TrainStatus }
  | { type: 'model.activated'; modelFile: string; at: string };

export type JobEvent = Extract<TrainEvent, { jobId: string }>;

/**
 * Fans training events out through Redis pub/sub, so an SSE client connected
 * to any API instance sees progress from whichever process runs the worker.
 */
@Injectable()
export class TrainEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrainEventsService.name);
  private readonly events$ = new Subject<TrainEvent>();
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(config: ConfigService) {
    const options = redisOptionsFromConfig(config);
    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);
    for (const client of [this.publisher, this.subscriber]) {
      client.on('error', (error) =>
        this.logger.warn(`Redis: ${error.message}`),
      );
    }
  }

  onModuleInit() {
    this.subscriber.on('message', (_channel, raw) => {
      try {
        this.events$.next(JSON.parse(raw));
      } catch (error) {
        this.logger.warn(`Bỏ qua sự kiện không đọc được: ${raw}`);
      }
    });
    // Subscribing before the connection is ready puts ioredis in subscriber
    // mode too early and its own ready check (INFO) is rejected, so wait for
    // `ready`. Not awaited, so the API still starts when Redis is down;
    // ioredis re-subscribes by itself after reconnects.
    const subscribe = () =>
      this.subscriber
        .subscribe(CHANNEL)
        .catch((error) =>
          this.logger.warn(`Redis subscribe: ${error.message}`),
        );
    if (this.subscriber.status === 'ready') subscribe();
    else this.subscriber.once('ready', subscribe);
  }

  async onModuleDestroy() {
    this.events$.complete();
    await Promise.allSettled([this.subscriber.quit(), this.publisher.quit()]);
  }

  /** Progress events must never fail a training, so publish errors are only logged. */
  async publish(event: TrainEvent): Promise<void> {
    try {
      await this.publisher.publish(CHANNEL, JSON.stringify(event));
    } catch (error) {
      this.logger.warn(`Không gửi được sự kiện ${event.type}: ${error}`);
    }
  }

  all(): Observable<TrainEvent> {
    return this.events$.asObservable();
  }

  forJob(jobId: string): Observable<JobEvent> {
    return this.events$.pipe(
      filter(
        (event): event is JobEvent => 'jobId' in event && event.jobId === jobId,
      ),
    );
  }
}
