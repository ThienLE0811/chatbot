import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateActions } from './dto/create-action.dto';
import { UpdateActions } from './dto/update-action.dto';
import { Actions, ActionsDocument } from './schema/action.schema';

@Injectable()
export class ActionsService {
  constructor(
    @InjectModel(Actions.name) private readonly model: Model<ActionsDocument>,
  ) {}

  async findAll(): Promise<Actions[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Actions> {
    return await this.model.findById(id).exec();
  }

  async create(createActions: CreateActions): Promise<Actions> {
    return await new this.model({
      ...createActions,
      createdAt: new Date(),
    }).save();
  }

  async update(id: string, updateActions: UpdateActions): Promise<Actions> {
    return await this.model
      .findByIdAndUpdate(
        id,
        { ...updateActions, updateAt: Date.now() },
        { new: true },
      )
      .exec();
  }

  async delete(id: string): Promise<Actions> {
    return await this.model.findByIdAndDelete(id).exec();
  }
}
