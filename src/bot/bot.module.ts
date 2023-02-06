import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotController } from './bot.controller';
import { FormsController } from './forms/form.controller';
import { FormsService } from './forms/form.service';
import { Forms, FormsSchema } from './forms/schema/response.schema';
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
    ]),
  ],
  controllers: [BotController,ResponsesController,SlotController,FormsController],
  providers: [ResponsesService,SlotsService,FormsService],
})
export class BotModule {}