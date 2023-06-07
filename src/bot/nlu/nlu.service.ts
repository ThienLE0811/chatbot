import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNlu } from './dto/create-nlu.dto';
import { UpdateNlu } from './dto/update-nlu.dto';
import { Nlu, NluDocument } from './schema/nlu.schema';

@Injectable()
export class NluService {
  constructor(
    @InjectModel(Nlu.name) private readonly model: Model<NluDocument>,
  ) {}

  async findAll(value: any): Promise<Nlu[]> {
    if (!value) {
      return await this.model.find().exec();
    }

    const intents = await this.model.find({ intent: value }).exec();
    console.log('intents', intents);
    return intents;
    // return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Nlu> {
    return await this.model.findById(id).exec();
  }

  async create(
    createNlus: CreateNlu,
  ): Promise<{ message: string; statusCode: number; Nlus: Nlu }> {
    const createNlu = await new this.model({
      ...createNlus,
      createdAt: new Date(),
    }).save();

    return {
      message: 'Tạo mới thành công',
      statusCode: 200,
      Nlus: createNlu,
    };
  }

  async update(
    id: string,
    updateNlu: UpdateNlu,
  ): Promise<{ message: string; statusCode: number; Nlu: Nlu }> {
    const updateNlus = await this.model
      .findByIdAndUpdate(
        id,
        { ...updateNlu, updateAt: Date.now() },
        { new: true },
      )
      .exec();
    return {
      message: 'Cập thật thành công',
      statusCode: 200,
      Nlu: updateNlus,
    };
  }

  async delete(
    id: string,
  ): Promise<{ message: string; statusCode: number; Nlu: Nlu }> {
    const deleteNlu = await this.model.findByIdAndDelete(id).exec();
    return {
      message: 'Xóa thành công',
      statusCode: 200,
      Nlu: deleteNlu,
    };
  }
}
