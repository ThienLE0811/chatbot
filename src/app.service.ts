import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongoService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async listCollections(): Promise<string[]> {
    const collections = await this.connection.db.listCollections().toArray();
    return collections.map((collection) => collection.name);
  }

//   async getAllData(): Promise<any[]> {
//     const collections = await this.connection.db.listCollections().toArray();
//     const dataPromises = collections.map(async (collection) => {
//       const data = await this.connection.collection(collection.name).find().toArray();
//       return { [collection.name]: data };
//     });
//     const result = await Promise.all(dataPromises);
//     return result.reduce((acc:any, curr) => ({ ...acc, ...curr }), {});
//   }

  async getAllData(): Promise<any[]> {
    const collections = await this.connection.db.listCollections().toArray();
    const filteredCollections = collections.filter(collection => collection.name !== 'users' && collection.name !== 'permissions' && collection.name !== 'roles');
    const dataPromises = filteredCollections.map(async (collection) => {
      const data = await this.connection.collection(collection.name).find({}, { projection: { _id: 0, __v:0 } }).toArray();
      return { [collection.name]: data };
    });
    const result = await Promise.all(dataPromises);
    return result.reduce((acc:any, curr) => ({ ...acc, ...curr }), {});
}
  
}
