import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { byName, deleteRecord, findRecord, updateRecord } from '../records';
import { CreateStories } from './dto/create-stories.dto';
import { UpdateStories } from './dto/update-stories.dto';
import { Stories, StoriesDocument } from './schema/stories.schema';

const NOT_FOUND = 'Không tìm thấy story';

@Injectable()
export class StoriesService {
  constructor(
    @InjectModel(Stories.name) private readonly model: Model<StoriesDocument>,
  ) {}

  findAll(name?: unknown): Promise<Stories[]> {
    return this.model.find(byName('story', name)).exec();
  }

  findOne(id: string): Promise<Stories> {
    return findRecord(this.model, id, NOT_FOUND);
  }

  create(dto: CreateStories): Promise<Stories> {
    return this.model.create({ ...dto, createdAt: new Date() });
  }

  update(id: string, dto: UpdateStories): Promise<Stories> {
    return updateRecord(
      this.model,
      id,
      { ...dto, updatedAt: new Date() },
      NOT_FOUND,
    );
  }

  delete(id: string): Promise<Stories> {
    return deleteRecord(this.model, id, NOT_FOUND);
  }
}
