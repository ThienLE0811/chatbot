import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { byName, deleteRecord, findRecord, updateRecord } from '../records';
import { CreateEntities } from './dto/create-entities.dto';
import { UpdateEntities } from './dto/update-entities.dto';
import { Entities, EntitiesDocument } from './schema/entities.schema';

const NOT_FOUND = 'Không tìm thấy thực thể';

@Injectable()
export class EntitiesService {
  constructor(
    @InjectModel(Entities.name) private readonly model: Model<EntitiesDocument>,
  ) {}

  findAll(name?: unknown): Promise<Entities[]> {
    return this.model.find(byName('nameEntities', name)).exec();
  }

  findOne(id: string): Promise<Entities> {
    return findRecord(this.model, id, NOT_FOUND);
  }

  create(dto: CreateEntities): Promise<Entities> {
    return this.model.create({ ...dto, createdAt: new Date() });
  }

  update(id: string, dto: UpdateEntities): Promise<Entities> {
    return updateRecord(
      this.model,
      id,
      { ...dto, updateAt: new Date() },
      NOT_FOUND,
    );
  }

  delete(id: string): Promise<Entities> {
    return deleteRecord(this.model, id, NOT_FOUND);
  }
}
