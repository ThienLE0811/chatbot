import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEntities } from './dto/create-entities.dto';
import { UpdateEntities } from './dto/update-entities.dto';
import { Entities, EntitiesDocument } from './schema/entities.schema';

@Injectable()
export class EntitiesService {
  constructor(
    @InjectModel(Entities.name) private readonly model: Model<EntitiesDocument>,
  ) {}

  async findAll(value: any): Promise<Entities[]> {
    if (!value) {
      return await this.model.find().exec();
    }

    const entities = await this.model.find({ nameEntities: value }).exec();
    return entities;
    // return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Entities> {
    return await this.model.findById(id).exec();
  }

  async create(createEntities: CreateEntities): Promise<Entities> {
    return await new this.model({
      ...createEntities,
      createdAt: new Date(),
    }).save();
  }

  async update(id: string, updateEntities: UpdateEntities): Promise<Entities> {
    return await this.model
      .findByIdAndUpdate(
        id,
        { ...updateEntities, updateAt: Date.now() },
        { new: true },
      )
      .exec();
  }

  async delete(id: string): Promise<Entities> {
    return await this.model.findByIdAndDelete(id).exec();
  }
}
