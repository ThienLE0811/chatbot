import { PartialType } from '@nestjs/mapped-types';
import { SlotsDto } from './slot.dto';

export class UpdateSlots extends PartialType(SlotsDto) {}
