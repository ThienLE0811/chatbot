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

  async findAll(): Promise<Stories[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Stories> {
    return await this.model.findById(id).exec();
  }

  async create(
    createStoriess: CreateStories,
  ): Promise<{ message: string; statusCode: number; Storiess: Stories }> {
    const createStories = await new this.model({
      ...createStoriess,
      createdAt: new Date(),
    }).save();

    return {
      message: 'Tạo mới thành công',
      statusCode: 200,
      Storiess: createStories,
    };
  }

  async update(
    id: string,
    updateStories: UpdateStories,
  ): Promise<{ message: string; statusCode: number; Stories: Stories }> {
    const updateStoriess = await this.model
      .findByIdAndUpdate(
        id,
        { ...updateStories, updateAt: Date.now() },
        { new: true },
      )
      .exec();
    return {
      message: 'Cập thật thành công',
      statusCode: 200,
      Stories: updateStoriess,
    };
  }

  async delete(
    id: string,
  ): Promise<{ message: string; statusCode: number; Stories: Stories }> {
    const deleteStories = await this.model.findByIdAndDelete(id).exec();
    return {
      message: 'Xóa thành công',
      statusCode: 200,
      Stories: deleteStories,
    };
  }
}
