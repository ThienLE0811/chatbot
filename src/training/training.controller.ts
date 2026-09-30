import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import {
  Observable,
  concat,
  ignoreElements,
  interval,
  map,
  merge,
  of,
  share,
  takeUntil,
} from 'rxjs';
import { RequirePermissions } from '../auth/access.decorators';
import { TrainingDataExporter } from './data/training-data.exporter';
import { TrainingDataValidator } from './data/training-data.validator';
import { ModelsService } from './models.service';
import { TrainEventsService } from './train-events.service';
import { TrainJobsService } from './train-jobs.service';

/** Keeps idle SSE connections open through proxies that drop silent sockets. */
const PING_MS = 20_000;
const MAX_PAGE_SIZE = 100;

@Controller('train')
@RequirePermissions('train.read')
export class TrainingController {
  constructor(
    private readonly jobs: TrainJobsService,
    private readonly models: ModelsService,
    private readonly events: TrainEventsService,
    private readonly exporter: TrainingDataExporter,
    private readonly validator: TrainingDataValidator,
  ) {}

  /**
   * Queues a training; returns 409 with the running job's id if one is in
   * progress. Unchanged data reuses the running model unless `force=true`.
   */
  @Post()
  @RequirePermissions('train.run')
  @HttpCode(HttpStatus.ACCEPTED)
  start(
    @Query('force', new DefaultValuePipe(false), ParseBoolPipe) force: boolean,
  ) {
    return this.jobs.enqueue(undefined, { force });
  }

  /** Dry run of the checks the worker performs, without training. */
  @Post('validate')
  @RequirePermissions('train.run')
  @HttpCode(HttpStatus.OK)
  async validate() {
    const dataset = await this.exporter.load();
    return {
      ...this.validator.validate(dataset),
      stats: this.exporter.export(dataset).stats,
    };
  }

  @Get('jobs')
  listJobs(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.jobs.list(
      Math.min(Math.max(limit, 1), MAX_PAGE_SIZE),
      Math.max(skip, 0),
    );
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.jobs.findOne(id);
  }

  /**
   * EventSource cannot send headers: SSE routes take `?access_token=`.
   *
   * SSE: a `snapshot` of the job, then `log` / `validation` events, ending
   * with `done`. Every event is a plain `message` whose data has a `type`.
   */
  @Sse('jobs/:id/stream')
  streamJob(@Param('id') id: string): Observable<MessageEvent> {
    return withPing(this.jobs.watch(id));
  }

  /** SSE of every training and model activation event, for list pages. */
  @Sse('events')
  streamAll(): Observable<MessageEvent> {
    return withPing(this.events.all());
  }

  @Get('models')
  listModels() {
    return this.models.list();
  }

  @Get('models/active')
  activeModel() {
    return this.models.active();
  }

  /** Rollback: loads a previously trained model into Rasa. */
  @Post('models/:modelFile/activate')
  @RequirePermissions('train.run')
  @HttpCode(HttpStatus.OK)
  activate(@Param('modelFile') modelFile: string) {
    return this.models.activate(modelFile);
  }
}

function withPing(source: Observable<object>): Observable<MessageEvent> {
  const events = source.pipe(share());
  const ended = concat(events.pipe(ignoreElements()), of(true));
  const pings = interval(PING_MS).pipe(
    map(() => ({ type: 'ping' })),
    takeUntil(ended),
  );
  return merge(events, pings).pipe(map((data) => ({ data })));
}
