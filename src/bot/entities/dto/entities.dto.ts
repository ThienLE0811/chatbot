import { IsArray, IsOptional } from 'class-validator';
import { Description, RecordName } from '../../common-dto';

export class EntitiesDto {
  @RecordName('Tên thực thể')
  nameEntities: string;

  /** Sample values of the entity. */
  @IsOptional()
  @IsArray()
  dataEntities?: unknown[];

  @IsOptional()
  @Description()
  description?: string;
}
