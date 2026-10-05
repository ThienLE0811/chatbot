import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { byName, deleteRecord, findRecord, updateRecord } from '../records';
import { CreateResponses } from './dto/create-response.dto';
import { UpdateResponses } from './dto/update-response.dto';
import { Responses, ResponsesDocument } from './schema/response.schema';

const NOT_FOUND = 'Không tìm thấy phản hồi';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectModel(Responses.name)
    private readonly model: Model<ResponsesDocument>,
  ) {}

  findAll(name?: unknown): Promise<Responses[]> {
    return this.model.find(byName('title', name)).exec();
  }

  findOne(id: string): Promise<Responses> {
    return findRecord(this.model, id, NOT_FOUND);
  }

  create(dto: CreateResponses): Promise<Responses> {
    return this.model.create({ ...dto, createdAt: new Date() });
  }

  update(id: string, dto: UpdateResponses): Promise<Responses> {
    return updateRecord(
      this.model,
      id,
      { ...dto, updateAt: new Date() },
      NOT_FOUND,
    );
  }

  delete(id: string): Promise<Responses> {
    return deleteRecord(this.model, id, NOT_FOUND);
  }
}
