import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { deleteRecord, findRecord, updateRecord } from '../records';
import { CreateActions } from './dto/create-action.dto';
import { UpdateActions } from './dto/update-action.dto';
import { Actions, ActionsDocument } from './schema/action.schema';

const NOT_FOUND = 'Không tìm thấy hành động';

@Injectable()
export class ActionsService {
  constructor(
    @InjectModel(Actions.name) private readonly model: Model<ActionsDocument>,
  ) {}

  findAll(): Promise<Actions[]> {
    return this.model.find().exec();
  }

  findOne(id: string): Promise<Actions> {
    return findRecord(this.model, id, NOT_FOUND);
  }

  create(dto: CreateActions): Promise<Actions> {
    return this.model.create({ ...dto, createdAt: new Date() });
  }

  update(id: string, dto: UpdateActions): Promise<Actions> {
    return updateRecord(
      this.model,
      id,
      { ...dto, updateAt: new Date() },
      NOT_FOUND,
    );
  }

  delete(id: string): Promise<Actions> {
    return deleteRecord(this.model, id, NOT_FOUND);
  }
}
