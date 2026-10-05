import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { byName, deleteRecord, findRecord, updateRecord } from '../records';
import { CreateSlots } from './dto/create-slot.dto';
import { UpdateSlots } from './dto/update-slot.dto';
import { Slots, SlotsDocument } from './schema/slot.schema';

const NOT_FOUND = 'Không tìm thấy slot';

@Injectable()
export class SlotsService {
  constructor(
    @InjectModel(Slots.name) private readonly model: Model<SlotsDocument>,
  ) {}

  findAll(name?: unknown): Promise<Slots[]> {
    return this.model.find(byName('nameSlot', name)).exec();
  }

  findOne(id: string): Promise<Slots> {
    return findRecord(this.model, id, NOT_FOUND);
  }

  create(dto: CreateSlots): Promise<Slots> {
    return this.model.create({ ...dto, createdAt: new Date() });
  }

  update(id: string, dto: UpdateSlots): Promise<Slots> {
    return updateRecord(
      this.model,
      id,
      { ...dto, updateAt: new Date() },
      NOT_FOUND,
    );
  }

  delete(id: string): Promise<Slots> {
    return deleteRecord(this.model, id, NOT_FOUND);
  }
}
