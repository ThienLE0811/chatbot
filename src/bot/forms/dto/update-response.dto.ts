import { PartialType } from '@nestjs/mapped-types';
import { FormsDto } from './forms.dto';

export class UpdateForms extends PartialType(FormsDto) {}
