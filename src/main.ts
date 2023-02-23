import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
require('dotenv').config()

var cors = require('cors')

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

//   app.use(function (req, res, next) {

//     // Website you wish to allow to connect
//     res.setHeader('Access-Control-Allow-Origin', process.env.REACT_URL);
//     console.log(process.env.REACT_URL)
//     // Request methods you wish to allow
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

//     // Request headers you wish to allow
//     res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

//     // Set to true if you need the website to include cookies in the requests sent
//     // to the API (e.g. in case you use sessions)
//     res.setHeader('Access-Control-Allow-Credentials', true);

//     // Pass to next layer of middleware
//     next();
// });

  app.use(cors())
  await app.listen(8000);
}
bootstrap();
