import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { deleteRecord, findRecord, updateRecord } from '../records';
import { CreateRules } from './dto/create-rules.dto';
import { UpdateRules } from './dto/update-rules.dto';
import { Rules, RulesDocument } from './schema/rules.schema';

const NOT_FOUND = 'Không tìm thấy rule';

@Injectable()
export class RulesService {
  constructor(
    @InjectModel(Rules.name) private readonly model: Model<RulesDocument>,
  ) {}

  findAll(): Promise<Rules[]> {
    return this.model.find().exec();
  }

  findOne(id: string): Promise<Rules> {
    return findRecord(this.model, id, NOT_FOUND);
  }

  create(dto: CreateRules): Promise<Rules> {
    return this.model.create({ ...dto, createdAt: new Date() });
  }

  update(id: string, dto: UpdateRules): Promise<Rules> {
    return updateRecord(
      this.model,
      id,
      { ...dto, updatedAt: new Date() },
      NOT_FOUND,
    );
  }

  delete(id: string): Promise<Rules> {
    return deleteRecord(this.model, id, NOT_FOUND);
  }
}
