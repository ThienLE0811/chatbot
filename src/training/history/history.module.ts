import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

import { HistorySchema, History } from './schema/historys.schema';

// import { Permission, PermissionSchema } from 'src/core_permission/schema/permission.schema';
// import { PermissionController } from 'src/core_permission/permission.controller';
// import { PermissionService } from 'src/core_permission/permission.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: History.name, schema: HistorySchema }]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
