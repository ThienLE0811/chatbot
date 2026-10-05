import { PartialType } from '@nestjs/mapped-types';
import { ResponsesDto } from './response.dto';

export class UpdateResponses extends PartialType(ResponsesDto) {}
