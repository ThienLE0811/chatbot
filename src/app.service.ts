import { Injectable, Req, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import axios from 'axios';
import yaml from 'js-yaml';
import * as YAML from 'yaml';
interface dataParseMessage {
  text: string;
  message_id: string;
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

  async getAllData(): Promise<any> {
    const collections = await this.connection.db.listCollections().toArray();
    const filteredCollections = collections.filter(
      (collection) =>
        collection.name !== 'users' &&
        collection.name !== 'permissions' &&
        collection.name !== 'actions' &&
        // collection.name !== 'stories' &&
        collection.name !== 'roles',
    );

    const dataPromises = filteredCollections.map(async (collection) => {
      let data: any = await this.connection
        .collection(collection.name)
        .find(
          {},
          {
            projection: {
              _id: 0,
              __v: 0,
              createdAt: 0,
              updatedAt: 0,
              updateAt: 0,
            },
          },
        )
        .toArray();
      // transform data for each collection
      if (collection.name === 'responses') {
        data = data.reduce((acc, curr) => {
          acc[curr.title] = curr.data;
          return acc;
        }, {});
      } else if (collection.name === 'intents') {
        data = data.map((item: any) => item.title);
      } else if (collection.name === 'forms') {
        data = {};
      } else if (collection.name === 'slots') {
        const slots = data.reduce((acc: any, curr: any) => {
          const { nameSlot, mapping, type } = curr;

          acc[nameSlot] = {
            type: type,
            mappings: mapping.map((m: any) => {
              return {
                type: m.type,
                entity: m.entity,
              };
            }),
          };

          return acc;
        }, {});

        data = slots;
      } else if (collection.name === 'nlu') {
        data = data.map((item: any) => {
          const { intent, examples } = item;
          const newExamples = `- ${examples.join('\n- ')}\n`;
          return {
            intent: intent,
            examples: newExamples,
          };
        });
      } else if (collection.name === 'actions') {
        data = data.map((item) => {
          if (item.action) {
            item.action = item.action.replace('action: ', '');
          }
          return item;
        });
      } else if (collection.name === 'entities') {
        data = data.map((item: any) => item.nameEntities);
      }

      return { [collection.name]: data };
    });

    const result = await Promise.all(dataPromises);
    // const pipeline = {
    //   pipeline: [
    //     {
    //       name: 'WhitespaceTokenizer',
    //     },
    //     {
    //       name: 'RegexFeaturizer',
    //     },
    //     {
    //       name: 'LexicalSyntacticFeaturizer',
    //     },
    //     {
    //       name: 'CountVectorsFeaturizer',
    //     },
    //     {
    //       name: 'CountVectorsFeaturizer',
    //       analyzer: 'char_wb',
    //       min_ngram: 1,
    //       max_ngram: 4,
    //     },
    //     {
    //       name: 'DIETClassifier',
    //       epochs: 100,
    //     },
    //   ],
    // };
    // const policies = {
    //   policies: [
    //     {
    //       name: 'MemoizationPolicy',
    //     },
    //     {
    //       name: 'TEDPolicy',
    //       max_history: 5,
    //       epochs: 10,
    //     },
    //     {
    //       name: 'RulePolicy',
    //     },
    //   ],
    // };

    // const pipeline = { pipeline: [] };
    // const policies = { policies: [] };

    // const newData = [pipeline, policies, ...result];
    // const dataJson = newData.reduce(
    //   (acc: any, curr) => ({ ...acc, ...curr }),
    //   {},
    // );

    const dataJson = result.reduce(
      (acc: any, curr) => ({ ...acc, ...curr }),
      {},
    );
    console.log('data1 ', dataJson);
    const dataYaml = YAML.stringify(dataJson, { indent: 2, lineWidth: -1 });

    // const dataModel = JSON.parse(dataYaml);
    const dataModel = dataYaml;
    // console.log('type', typeof dataYaml);
    // console.log('data ', dataYaml);
    // console.log(process.env.CALLBACK_URL);
    try {
      const response = await axios.post(
        `${process.env.RASA_URL}/model/train`,
        dataModel,
        {
          params: {
            token: 'rasaToken',
            // callback_url: `${process.env.CALLBACK_URL}`,
            // callback_url:
            //   'https://webhook.site/bd053536-afc3-4751-af11-bde0a542a546',
          },
          headers: {
            'Content-Type': 'application/yaml',
            Accept: '*',
          },
        },
      );

      const dataReplace = {
        model_file: `/app/models/${response.headers.filename}`,
      };
      console.log('dataReplace:: ', dataReplace);
      const replace = await axios.put(
        `${process.env.RASA_URL}/model`,
        dataReplace,
        {
          params: {
            token: 'rasaToken',
            // callback_url: `${process.env.CALLBACK_URL}`,
            // callback_url:
            //   'https://webhook.site/bd053536-afc3-4751-af11-bde0a542a546',
          },
        },
      );

      console.log('replace', replace);
      // console.log('response:: ', response);
      // console.log('fileName ::::: ', response.headers.filename);

      return response.headers;
    } catch (error) {
      console.log('bị lỗi ::::::::::', error);
      return error;
    }
    return dataModel;
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
            token: 'rasaToken',
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
