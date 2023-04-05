
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEntities} from './dto/create-entities.dto';
import { UpdateEntities} from './dto/update-entities.dto';
import { Entities, EntitiesDocument } from './schema/Entities.schema';



@Injectable()
export class EntitiesService {
  constructor(@InjectModel(Entities.name) private readonly model: Model<EntitiesDocument>) {}

  async findAll(): Promise<Entities[]> {
   
    return await this.model.find().exec();
  }

  async findOne(id: string): Promise<Entities> {
    return await this.model.findById(id).exec();
  }

  async create(createEntities: CreateEntities): Promise<{message: string,statusCode: number, Entities: Entities}> {
    const createIntent = await new this.model({
      ...createEntities,
      createdAt: new Date(),
    }).save();


    return {
      message: "Tạo mới thành công",
      statusCode: 200,
      Entities: createIntent
    }
  }

  async update(id: string, updateEntities: UpdateEntities): Promise<{message: string,statusCode: number, Entities: Entities}> {
    const updateIntent = await this.model.findByIdAndUpdate(id, {...updateEntities,updateAt: Date.now()}, { new: true }).exec();
    return {
      message: "Cập thật thành công",
      statusCode: 200,
      Entities: updateIntent
    }
  }

  async delete(id: string): Promise<{message: string,statusCode: number, Entities: Entities}> {
    const deleteIntent = await this.model.findByIdAndDelete(id).exec();
    return {
      message: "Xóa thành công",
      statusCode: 200,
      Entities: deleteIntent
    }
  }

}