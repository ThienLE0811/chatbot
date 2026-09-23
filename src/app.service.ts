import { Injectable, Req, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import axios from 'axios';
interface dataParseMessage {
  text: string;
  message_id: string;
}

@Injectable()
export class MongoService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async listCollections(): Promise<string[]> {
    const collections = await this.connection.db.listCollections().toArray();
    return collections.map((collection) => collection.name);
  }

  async callBackUrl(@Res() response: any) {
    try {
      const callbackData = response;
      console.log('callbackData:: ', callbackData);

      return callbackData;
    } catch (error) {
      console.log('bị lỗi ::::::::::', error);
      return error;
    }
  }

  async parseMessage(data: dataParseMessage): Promise<any[]> {
    // const data = {
    //     "text": "hello",
    //     "message_id": "b2831e73-1407-4ba0-a861-0f30a42a2a5a"
    // }
    console.log('data ::::: ', data);

    try {
      const response = await axios.post(
        `${process.env.RASA_URL}/model/parse`,
        data,
        {
          params: {
            token: process.env.RASA_TOKEN,
          },
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/x-yaml',
          },
        },
      );
      console.log('response ::::: ', response);
      console.log('response headers ::::: ', response.headers);
      return response.data;
    } catch (error) {
      console.log('bị lỗi ::::::::::', error);
      return error;
    }
  }
}
