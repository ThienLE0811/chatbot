import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateStories } from './dto/create-stories.dto';
import { UpdateStories } from './dto/update-stories.dto';
import { Stories, StoriesDocument } from './schema/stories.schema';

@Injectable()
export class StoriesService {
  constructor(
    @InjectModel(Stories.name) private readonly model: Model<StoriesDocument>,
  ) {}

  async findAll(value: any): Promise<Stories[]> {
    if (!value) {
      return await this.model.find().exec();
    }

    const stories = await this.model.find({ story: value }).exec();

    return stories;
    // return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Stories> {
    return await this.model.findById(id).exec();
  }

  async create(dto: CreateStories): Promise<Stories> {
    return await new this.model({
      ...dto,
      createdAt: new Date(),
    }).save();
  }

  async update(id: string, updateStories: UpdateStories): Promise<Stories> {
    return await this.model
      .findByIdAndUpdate(
        id,
        { ...updateStories, updatedAt: Date.now() },
        { new: true },
      )
      .exec();
  }

  async delete(id: string): Promise<Stories> {
    return await this.model.findByIdAndDelete(id).exec();
  }
}
