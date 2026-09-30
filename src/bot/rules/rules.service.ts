import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRules } from './dto/create-rules.dto';
import { UpdateRules } from './dto/update-rules.dto';
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

  async create(dto: CreateRules): Promise<Rules> {
    return await new this.model({
      ...dto,
      createdAt: new Date(),
    }).save();
  }

  async update(id: string, updateRules: UpdateRules): Promise<Rules> {
    return await this.model
      .findByIdAndUpdate(
        id,
        { ...updateRules, updatedAt: Date.now() },
        { new: true },
      )
      .exec();
  }

  async delete(id: string): Promise<Rules> {
    return await this.model.findByIdAndDelete(id).exec();
  }
}
