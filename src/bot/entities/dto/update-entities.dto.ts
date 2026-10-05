import { PartialType } from '@nestjs/mapped-types';
import { EntitiesDto } from './entities.dto';

export class UpdateEntities extends PartialType(EntitiesDto) {}
