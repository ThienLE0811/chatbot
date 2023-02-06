
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateForms} from './dto/create-response.dto';
import { UpdateForms} from './dto/update-response.dto';
import { Forms, FormsDocument } from './schema/response.schema';



@Injectable()
export class FormsService {
  constructor(@InjectModel(Forms.name) private readonly model: Model<FormsDocument>) {}

  async findAll(): Promise<Forms[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Forms> {
    return await this.model.findById(id).exec();
  }

  async create(createForms: CreateForms): Promise<Forms> {
    return await new this.model({
      ...createForms,
      createdAt: new Date(),
    }).save();
  }

  async update(id: string, updateForms: UpdateForms): Promise<Forms> {
    return await this.model.findByIdAndUpdate(id, updateForms).exec();
  }

  async delete(id: string): Promise<Forms> {
    return await this.model.findByIdAndDelete(id).exec();
  }

}