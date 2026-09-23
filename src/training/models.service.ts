import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RasaClient, isValidModelFile } from './rasa/rasa.client';
import { TrainEventsService } from './train-events.service';
import { TrainJobsService } from './train-jobs.service';
import { TrainStatus } from './training.constants';
import type { TrainingDataStats } from './data/training-data.types';

export interface ModelVersion {
  modelFile: string;
  /** `train` for models from the job queue, `legacy` for the old train history. */
  source: 'train' | 'legacy';
  trainJobId: string | null;
  status: TrainStatus | null;
  createdAt: Date | null;
  durationMs: number | null;
  dataHash: string | null;
  stats: TrainingDataStats | null;
  lastActivatedAt: Date | null;
  isActive: boolean;
}

export interface ModelList {
  rasaReachable: boolean;
  activeModel: string | null;
  items: ModelVersion[];
}

@Injectable()
export class ModelsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly jobs: TrainJobsService,
    private readonly rasa: RasaClient,
    private readonly events: TrainEventsService,
  ) {}

  async list(): Promise<ModelList> {
    const [jobs, legacy, activeModel] = await Promise.all([
      this.jobs.findWithModels(),
      this.legacyHistory(),
      this.activeModel(),
    ]);

    // Newest first, so a model file seen twice keeps its most recent job.
    const seen = new Set<string>();
    const uniqueJobs = jobs.filter(
      (job) => !seen.has(job.modelFile) && seen.add(job.modelFile),
    );
    const items: ModelVersion[] = uniqueJobs.map((job) => ({
      modelFile: job.modelFile,
      source: 'train',
      trainJobId: String(job._id),
      status: job.status,
      createdAt: job.createdAt ?? null,
      durationMs: job.durationMs ?? null,
      dataHash: job.dataHash ?? null,
      stats: job.stats ?? null,
      lastActivatedAt: job.lastActivatedAt ?? null,
      isActive: job.modelFile === activeModel,
    }));

    const known = new Set(items.map((item) => item.modelFile));
    for (const record of legacy) {
      if (known.has(record.name) || !isValidModelFile(record.name)) continue;
      known.add(record.name);
      items.push({
        modelFile: record.name,
        source: 'legacy',
        trainJobId: null,
        status: record.status === 'true' ? TrainStatus.Loaded : null,
        createdAt: record.createdAt ? new Date(record.createdAt) : null,
        durationMs: null,
        dataHash: null,
        stats: null,
        lastActivatedAt: null,
        isActive: record.name === activeModel,
      });
    }

    items.sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
    return {
      rasaReachable: activeModel !== undefined,
      activeModel: activeModel ?? null,
      items,
    };
  }

  async active() {
    const status = await this.rasa.status().catch((error) => {
      throw new BadGatewayException(error.message);
    });
    return {
      modelFile: basename(status.model_file),
      modelId: status.model_id,
      activeTrainingJobs: status.num_active_training_jobs,
    };
  }

  /** Loads an earlier model into Rasa: the one-click rollback. */
  async activate(modelFile: string) {
    if (!isValidModelFile(modelFile)) {
      throw new BadRequestException(
        `Tên file model không hợp lệ: ${modelFile}`,
      );
    }
    if (!(await this.isKnownModel(modelFile))) {
      throw new NotFoundException(`Không có model ${modelFile} trong lịch sử`);
    }

    try {
      await this.rasa.loadModel(modelFile);
    } catch (error) {
      throw new BadGatewayException(error.message);
    }
    await this.jobs.markActivated(modelFile);
    const at = new Date().toISOString();
    await this.events.publish({ type: 'model.activated', modelFile, at });
    return { modelFile, activatedAt: at };
  }

  /** undefined when Rasa is unreachable, null when it runs without a model. */
  private async activeModel(): Promise<string | null | undefined> {
    try {
      const status = await this.rasa.status();
      return basename(status.model_file);
    } catch {
      return undefined;
    }
  }

  private async isKnownModel(modelFile: string): Promise<boolean> {
    const [trained, legacy] = await Promise.all([
      this.jobs.hasModel(modelFile),
      this.connection
        .collection('histories')
        .countDocuments({ name: modelFile }),
    ]);
    return trained || legacy > 0;
  }

  private legacyHistory(): Promise<Record<string, any>[]> {
    return this.connection
      .collection('histories')
      .find({}, { projection: { name: 1, status: 1, createdAt: 1 } })
      .toArray();
  }
}

/** Rasa reports the model as a path, e.g. /app/models/x.tar.gz. */
function basename(path: string | null): string | null {
  if (!path) return null;
  return path.split(/[\\/]/).pop() ?? null;
}
