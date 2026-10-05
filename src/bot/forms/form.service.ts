import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { deleteRecord, findRecord, updateRecord } from '../records';
import { CreateForms } from './dto/create-response.dto';
import { UpdateForms } from './dto/update-response.dto';
import { Forms, FormsDocument } from './schema/response.schema';

const NOT_FOUND = 'Không tìm thấy form';

@Injectable()
export class FormsService {
  constructor(
    @InjectModel(Forms.name) private readonly model: Model<FormsDocument>,
  ) {}

  findAll(): Promise<Forms[]> {
    return this.model.find().exec();
  }

  findOne(id: string): Promise<Forms> {
    return findRecord(this.model, id, NOT_FOUND);
  }

  create(dto: CreateForms): Promise<Forms> {
    return this.model.create({ ...dto, createdAt: new Date() });
  }

  update(id: string, dto: UpdateForms): Promise<Forms> {
    return updateRecord(
      this.model,
      id,
      { ...dto, updateAt: new Date() },
      NOT_FOUND,
    );
  }

  delete(id: string): Promise<Forms> {
    return deleteRecord(this.model, id, NOT_FOUND);
  }
}
