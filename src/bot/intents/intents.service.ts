import { Body, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateIntents } from './dto/create-response.dto';
import { UpdateIntents } from './dto/update-response.dto';
import { Intents, IntentsDocument } from './schema/intents.schema';

@Injectable()
export class IntentsService {
  constructor(
    @InjectModel(Intents.name) private readonly model: Model<IntentsDocument>,
  ) {}

  async findAll(value: any): Promise<Intents[]> {
    if (!value) {
      return await this.model.find().exec();
    }

    const intents = await this.model.find({ title: value }).exec();
    console.log('intents', intents);
    return intents;
  }

  async findOne(id: string): Promise<Intents> {
    return await this.model.findById(id).exec();
  }

  async create(
    createIntents: CreateIntents,
  ): Promise<{ message: string; statusCode: number; intents: Intents }> {
    const createIntent = await new this.model({
      ...createIntents,
      createdAt: new Date(),
    }).save();

    return {
      message: 'Tạo mới thành công',
      statusCode: 200,
      intents: createIntent,
    };
  }

  async update(
    id: string,
    updateIntents: UpdateIntents,
  ): Promise<{ message: string; statusCode: number; intents: Intents }> {
    const updateIntent = await this.model
      .findByIdAndUpdate(
        id,
        { ...updateIntents, updateAt: Date.now() },
        { new: true },
      )
      .exec();
    return {
      message: 'Cập thật thành công',
      statusCode: 200,
      intents: updateIntent,
    };
  }

  async delete(
    id: string,
  ): Promise<{ message: string; statusCode: number; intents: Intents }> {
    const deleteIntent = await this.model.findByIdAndDelete(id).exec();
    return {
      message: 'Xóa thành công',
      statusCode: 200,
      intents: deleteIntent,
    };
  }
}
