import { toTrainingDataset } from './training-data.exporter';
import { TRAINING_SEED } from './training-data.seed';
import { TrainingDataValidator } from './training-data.validator';

describe('TRAINING_SEED', () => {
  const report = new TrainingDataValidator().validate(
    toTrainingDataset(TRAINING_SEED),
  );

  it('passes validation without errors', () => {
    expect(report.errors).toEqual([]);
  });

  it('has no quality warnings', () => {
    expect(report.warnings).toEqual([]);
  });
});
