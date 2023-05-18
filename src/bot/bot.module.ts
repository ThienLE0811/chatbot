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
import { Nlu, NluSchema } from './nlu/schema/nlu.schema';
import { NluController } from './nlu/nlu.controller';
import { NluService } from './nlu/nlu.service';
import { StoriesController } from './stories/stories.controller';
import { StoriesService } from './stories/stories.service';
import { Stories, StoriesSchema } from './stories/schema/stories.schema';
import { Actions, ActionsSchema } from './actions/schema/action.schema';
import { ActionsController } from './actions/action.controller';
import { ActionsService } from './actions/action.service';
import { RulesService } from './rules/rules.service';
import { RulesController } from './rules/rules.controller';
import { Rules, RulesSchema } from './rules/schema/rules.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Responses.name, schema: ResponsesSchema },
      { name: Slots.name, schema: SlotsSchema },
      { name: Forms.name, schema: FormsSchema },
      { name: Intents.name, schema: IntentsSchema },
      { name: Entities.name, schema: EntitiesSchema },
      { name: Nlu.name, schema: NluSchema },
      { name: Stories.name, schema: StoriesSchema },
      { name: Actions.name, schema: ActionsSchema },
      { name: Rules.name, schema: RulesSchema },
    ]),
  ],
  controllers: [
    BotController,
    ResponsesController,
    SlotController,
    FormsController,
    IntentsController,
    EntitiesController,
    NluController,
    StoriesController,
    ActionsController,
    RulesController,
  ],
  providers: [
    ResponsesService,
    SlotsService,
    FormsService,
    IntentsService,
    EntitiesService,
    NluService,
    StoriesService,
    ActionsService,
    RulesService,
  ],
})
export class BotModule {}
