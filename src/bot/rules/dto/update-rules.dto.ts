import { PartialType } from '@nestjs/mapped-types';
import { RulesDto } from './rules.dto';

export class UpdateRules extends PartialType(RulesDto) {}
