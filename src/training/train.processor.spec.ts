import { UnrecoverableError } from 'bullmq';
import { RasaError } from './rasa/rasa.client';
import { TrainProcessor } from './train.processor';
import { TrainStatus } from './training.constants';

describe('TrainProcessor', () => {
  const stats = {
    intents: 2,
    examples: 4,
    entities: 0,
    slots: 0,
    responses: 1,
    actions: 0,
    stories: 1,
    rules: 0,
  };
  let jobs: Record<string, jest.Mock>;
  let exporter: Record<string, jest.Mock>;
  let validator: { validate: jest.Mock };
  let rasa: Record<string, jest.Mock>;
  let processor: TrainProcessor;
  const job = { data: { trainJobId: 'job-1' } } as any;

  beforeEach(() => {
    jobs = {
      findOne: jest.fn().mockResolvedValue({ status: TrainStatus.Queued }),
      transition: jest.fn().mockResolvedValue(undefined),
      log: jest.fn().mockResolvedValue(undefined),
      recordValidation: jest.fn().mockResolvedValue(undefined),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
    };
    exporter = {
      load: jest.fn().mockResolvedValue({}),
      export: jest
        .fn()
        .mockReturnValue({ yaml: 'intents: []', hash: 'abc', stats }),
    };
    validator = {
      validate: jest
        .fn()
        .mockReturnValue({ valid: true, errors: [], warnings: [] }),
    };
    rasa = {
      status: jest.fn().mockResolvedValue({ model_file: null }),
      train: jest.fn().mockResolvedValue({ modelFile: 'm1.tar.gz' }),
      loadModel: jest.fn().mockResolvedValue(undefined),
    };
    processor = new TrainProcessor(
      jobs as any,
      exporter as any,
      validator as any,
      rasa as any,
    );
  });

  it('moves through validating, training and loading before completing', async () => {
    await expect(processor.process(job)).resolves.toEqual({
      modelFile: 'm1.tar.gz',
    });

    expect(jobs.transition.mock.calls.map((call) => call[1])).toEqual([
      TrainStatus.Validating,
      TrainStatus.Training,
      TrainStatus.Loading,
    ]);
    expect(rasa.train).toHaveBeenCalledWith('intents: []');
    expect(rasa.loadModel).toHaveBeenCalledWith('m1.tar.gz');
    expect(jobs.complete).toHaveBeenCalledWith(
      'job-1',
      'm1.tar.gz',
      expect.any(Date),
    );
    expect(jobs.fail).not.toHaveBeenCalled();
  });

  it('fails at validation without calling Rasa when the data has errors', async () => {
    validator.validate.mockReturnValue({
      valid: false,
      errors: [{ severity: 'error', code: 'X', path: 'nlu', message: 'hỏng' }],
      warnings: [],
    });

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );

    expect(rasa.status).not.toHaveBeenCalled();
    expect(rasa.train).not.toHaveBeenCalled();
    expect(jobs.log).toHaveBeenCalledWith(
      'job-1',
      TrainStatus.Validating,
      'error',
      'nlu: hỏng',
    );
    expect(jobs.fail).toHaveBeenCalledWith(
      'job-1',
      TrainStatus.Validating,
      expect.objectContaining({ message: expect.stringContaining('1 lỗi') }),
      expect.any(Date),
    );
  });

  it('records the stage and Rasa error when training fails', async () => {
    rasa.train.mockRejectedValue(
      new RasaError('Rasa train thất bại (HTTP 500)', { status: 500 }),
    );

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );

    expect(rasa.loadModel).not.toHaveBeenCalled();
    expect(jobs.fail).toHaveBeenCalledWith(
      'job-1',
      TrainStatus.Training,
      { message: 'Rasa train thất bại (HTTP 500)', details: { status: 500 } },
      expect.any(Date),
    );
  });

  it('skips jobs that already finished', async () => {
    jobs.findOne.mockResolvedValue({ status: TrainStatus.Failed });

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );

    expect(jobs.transition).not.toHaveBeenCalled();
    expect(jobs.fail).not.toHaveBeenCalled();
  });
});
