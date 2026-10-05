import { PartialType } from '@nestjs/mapped-types';
import { StoriesDto } from './stories.dto';

export class UpdateStories extends PartialType(StoriesDto) {}
