import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import axios from "axios"

interface dataParseMessage {
  text: string,
  message_id: string
}

@Injectable()
export class MongoService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async listCollections(): Promise<string[]> {
    const collections = await this.connection.db.listCollections().toArray();
    return collections.map((collection) => collection.name);
  }



//   async getAllData(): Promise<any[]> {
//     const collections = await this.connection.db.listCollections().toArray();
//     const filteredCollections = collections.filter(collection => collection.name !== 'users' && collection.name !== 'permissions' && collection.name !== 'roles');
//     const dataPromises = filteredCollections.map(async (collection) => {
//       const data = await this.connection.collection(collection.name).find({}, { projection: { _id: 0, __v:0 } }).toArray();
//       return { [collection.name]: data };
//     });
//     const result = await Promise.all(dataPromises);
//     return result.reduce((acc:any, curr) => ({ ...acc, ...curr }), {});
// }

// async getAllData(): Promise<any[]> {
//   const collections = await this.connection.db.listCollections().toArray();
//   const filteredCollections = collections.filter(collection => collection.name !== 'users' && collection.name !== 'permissions' && collection.name !== 'roles');
//   const dataPromises = filteredCollections.map(async (collection) => {
//     const data = await this.connection.collection(collection.name).find({}, { projection: { _id: 0, __v:0 } }).toArray();
//     const transformedData = data.map((item) => item.title);
//     return { [collection.name]: transformedData };
//   });
//   const result = await Promise.all(dataPromises);
//   return result.reduce((acc:any, curr) => ({ ...acc, ...curr }), {});
// }

async getAllData(): Promise<any[]> {
  const collections = await this.connection.db.listCollections().toArray();
  const filteredCollections = collections.filter(collection => collection.name !== 'users' && collection.name !== 'permissions' && collection.name !== 'roles');

  const dataPromises = filteredCollections.map(async (collection) => {
    let data:any = await this.connection.collection(collection.name).find({}, { projection: { _id: 0, __v: 0 } }).toArray();
    // transform data for each collection
    if (collection.name === 'responses') {
      data = data.reduce((acc, curr) => {
        const title = curr.title.replace('utter_', '');
        acc[title] = curr.data;
        return acc;
      }, {});
    } else if (collection.name === 'intents') {
      data = data.map((item: any) => item.title);
    } else if (collection.name === 'domains') {
      data = data.map((item: any) => item.domain);
    }
    return { [collection.name]: data };
  });

  const result = await Promise.all(dataPromises);
  return result.reduce((acc:any, curr) => ({ ...acc, ...curr }), {});
}

 async parseMessage(data: dataParseMessage ):Promise<any[]> {
    // const data = { 
    //     "text": "hello",
    //     "message_id": "b2831e73-1407-4ba0-a861-0f30a42a2a5a"
    // }
    console.log("data ::::: ",data)
    
    try {
    const response = await axios.post("http://139.177.184.45:31006/model/parse",data ,{
      params: {
        token: 'rasaToken'
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/x-yaml'
      }
    });
    console.log("response ::::: ",response)
    return response.data;
  } catch (error) {
    console.log("bị lỗi ::::::::::", error);
    return [];
  }
}
}
