import { PartialType } from '@nestjs/mapped-types';
import { ActionsDto } from './action.dto';

export class UpdateActions extends PartialType(ActionsDto) {}
