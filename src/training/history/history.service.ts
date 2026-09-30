import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { History, HistoryDocument } from './schema/historys.schema';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(History.name) private readonly model: Model<HistoryDocument>,
  ) {}

  async findAll(): Promise<History[]> {
    return await this.model.find().exec();
  }
}
