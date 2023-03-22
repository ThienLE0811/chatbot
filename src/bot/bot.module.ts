import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotController } from './bot.controller';
import { EntitiesController } from './entities/entities.controller';
import { EntitiesService } from './entities/entities.service';
import { Entities, EntitiesSchema } from './entities/schema/entities.schema';
import { FormsController } from './forms/form.controller';
import { FormsService } from './forms/form.service';
import { Forms, FormsSchema } from './forms/schema/response.schema';
import { IntentsController } from './intents/intents.controller';
import { IntentsService } from './intents/intents.service';
import { Intents, IntentsSchema } from './intents/schema/intents.schema';
import { ResponsesController } from './response/response.controller';
import { ResponsesService } from './response/response.service';
import { Responses, ResponsesSchema } from './response/schema/response.schema';
import { Slots, SlotsSchema } from './slots/schema/slot.schema';
import { SlotController } from './slots/slot.controller';
import { SlotsService } from './slots/slot.service';


@Module({
    imports: [
    MongooseModule.forFeature([
      { name: Responses.name, schema: ResponsesSchema },
      { name: Slots.name, schema: SlotsSchema },
      { name: Forms.name, schema: FormsSchema },
      {name: Intents.name, schema: IntentsSchema},
      {name: Entities.name, schema: EntitiesSchema}
    ]),
  ],
  controllers: [BotController,ResponsesController,SlotController,FormsController,IntentsController, EntitiesController],
  providers: [ResponsesService,SlotsService,FormsService,IntentsService, EntitiesService],
})
export class BotModule {}