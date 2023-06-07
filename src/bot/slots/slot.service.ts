import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSlots } from './dto/create-slot.dto';
import { UpdateSlots } from './dto/update-slot.dto';
import { Slots, SlotsDocument } from './schema/slot.schema';

@Injectable()
export class SlotsService {
  constructor(
    @InjectModel(Slots.name) private readonly model: Model<SlotsDocument>,
  ) {}

  async findAll(value: any): Promise<Slots[]> {
    if (!value) {
      return await this.model.find().exec();
    }

    const slots = await this.model.find({ nameSlot: value }).exec();

    return slots;
  }

  async findOne(id: string): Promise<Slots> {
    return await this.model.findById(id).exec();
  }

  async create(
    createSlots: CreateSlots,
  ): Promise<{ message: string; statusCode: number; createSlots: Slots }> {
    const create = await new this.model({
      ...createSlots,
      createdAt: new Date(),
    }).save();

    return {
      message: 'Tạo mới slots thành công',
      statusCode: 200,
      createSlots: create,
    };
  }

  async update(
    id: string,
    updateSlots: UpdateSlots,
  ): Promise<{ message: string; statusCode: number; updateSlots: Slots }> {
    const update = await this.model.findByIdAndUpdate(id, updateSlots).exec();
    return {
      message: 'Cập nhật slots thành công',
      statusCode: 200,
      updateSlots: update,
    };
  }

  // async delete(id: string): Promise<Slots> {
  //   return await this.model.findByIdAndDelete(id).exec();
  // }

  async delete(
    id: string,
  ): Promise<{ message: string; statusCode: number; Slots: Slots }> {
    const deleteSlots = await this.model.findByIdAndDelete(id).exec();
    return {
      message: 'Xóa thành công',
      statusCode: 200,
      Slots: deleteSlots,
    };
  }
}
