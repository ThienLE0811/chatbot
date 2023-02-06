
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSlots} from './dto/create-slot.dto';
import { UpdateSlots } from './dto/update-slot.dto';
import { Slots, SlotsDocument } from './schema/slot.schema';



@Injectable()
export class SlotsService {
  constructor(@InjectModel(Slots.name) private readonly model: Model<SlotsDocument>) {}

  async findAll(): Promise<Slots[]> {
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Slots> {
    return await this.model.findById(id).exec();
  }

  async create(createSlots: CreateSlots): Promise<Slots> {
    return await new this.model({
      ...createSlots,
      createdAt: new Date(),
    }).save();
  }

  async update(id: string, updateSlots: UpdateSlots): Promise<Slots> {
    return await this.model.findByIdAndUpdate(id, updateSlots).exec();
  }

  async delete(id: string): Promise<Slots> {
    return await this.model.findByIdAndDelete(id).exec();
  }

}