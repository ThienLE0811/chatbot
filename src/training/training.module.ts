import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingDataExporter } from './data/training-data.exporter';
import { TrainingDataValidator } from './data/training-data.validator';
import { ModelsService } from './models.service';
import { RasaClient } from './rasa/rasa.client';
import { redisOptionsFromConfig } from './redis.config';
import { TrainJob, TrainJobSchema } from './schemas/train-job.schema';
import { TrainEventsService } from './train-events.service';
import { TrainJobsService } from './train-jobs.service';
import { TrainProcessor } from './train.processor';
import { TrainingController } from './training.controller';
import { TRAIN_QUEUE } from './training.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrainJob.name, schema: TrainJobSchema },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisOptionsFromConfig(config),
      }),
    }),
    BullModule.registerQueue({ name: TRAIN_QUEUE }),
  ],
  controllers: [TrainingController],
  providers: [
    RasaClient,
    TrainingDataExporter,
    TrainingDataValidator,
    TrainEventsService,
    TrainJobsService,
    ModelsService,
    TrainProcessor,
  ],
  exports: [TrainingDataExporter, RasaClient],
})
export class TrainingModule {}
