
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateResponses } from './dto/create-response.dto';
import { UpdateResponses } from './dto/update-response.dto';
import { Responses, ResponsesDocument } from './schema/response.schema';



@Injectable()
export class ResponsesService {
  constructor(@InjectModel(Responses.name) private readonly model: Model<ResponsesDocument>) {}

  async findAll(): Promise<Responses[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Responses> {
    return await this.model.findById(id).exec();
  }

  async create(createResponses: CreateResponses): Promise<Responses> {
    return await new this.model({
      ...createResponses,
      createdAt: new Date(),
    }).save();
  }

  async update(id: string, updateResponses: UpdateResponses): Promise<Responses> {
    return await this.model.findByIdAndUpdate(id, updateResponses).exec();
  }

  async delete(id: string): Promise<Responses> {
    return await this.model.findByIdAndDelete(id).exec();
  }

}