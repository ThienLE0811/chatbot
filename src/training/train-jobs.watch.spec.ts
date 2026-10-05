import { Subject } from 'rxjs';
import { TrainJobsService } from './train-jobs.service';
import { TrainStatus } from './training.constants';

describe('TrainJobsService.watch', () => {
  it('ends the stream when the events end, e.g. on shutdown', async () => {
    const events$ = new Subject<any>();
    const service = new TrainJobsService(
      {} as any,
      {} as any,
      { forJob: () => events$.asObservable() } as any,
    );
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ status: TrainStatus.Training, logSeq: 0 } as any);

    const received: unknown[] = [];
    const ended = new Promise<void>((resolve) =>
      service.watch('job-1').subscribe({
        next: (message) => received.push(message),
        complete: resolve,
      }),
    );
    await new Promise((resolve) => setImmediate(resolve));
    events$.complete();

    await ended;
    expect(received).toEqual([
      { type: 'snapshot', job: { status: TrainStatus.Training, logSeq: 0 } },
    ]);
  });
});
