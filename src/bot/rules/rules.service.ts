import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRules } from './dto/create-Rules.dto';
import { UpdateRules } from './dto/update-Rules.dto';
import { Rules, RulesDocument } from './schema/rules.schema';

@Injectable()
export class RulesService {
  constructor(
    @InjectModel(Rules.name) private readonly model: Model<RulesDocument>,
  ) {}

  async findAll(): Promise<Rules[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Rules> {
    return await this.model.findById(id).exec();
  }

  async create(
    createRuless: CreateRules,
  ): Promise<{ message: string; statusCode: number; Ruless: Rules }> {
    const createRules = await new this.model({
      ...createRuless,
      createdAt: new Date(),
    }).save();

    return {
      message: 'Tạo mới thành công',
      statusCode: 200,
      Ruless: createRules,
    };
  }

  async update(
    id: string,
    updateRules: UpdateRules,
  ): Promise<{ message: string; statusCode: number; Rules: Rules }> {
    const updateRuless = await this.model
      .findByIdAndUpdate(
        id,
        { ...updateRules, updatedAt: Date.now() },
        { new: true },
      )
      .exec();
    return {
      message: 'Cập thật thành công',
      statusCode: 200,
      Rules: updateRuless,
    };
  }

  async delete(
    id: string,
  ): Promise<{ message: string; statusCode: number; Rules: Rules }> {
    const deleteRules = await this.model.findByIdAndDelete(id).exec();
    return {
      message: 'Xóa thành công',
      statusCode: 200,
      Rules: deleteRules,
    };
  }
}
