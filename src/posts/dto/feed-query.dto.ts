import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum FeedType {
  ALL = 'all',
  FOLLOWING_USERS = 'following_users',
  FOLLOWING_SECTORS = 'following_sectors',
}

export class FeedQueryDto {
  @IsOptional()
  @IsEnum(FeedType, {
    message: `feed must be one of: ${Object.values(FeedType).join(', ')}`,
  })
  feed: FeedType = FeedType.ALL;

  // Required when feed is following_users or following_sectors.
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
