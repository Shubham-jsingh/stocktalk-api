import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum FeedType {
  ALL = 'all',
  FOLLOWING_USERS = 'following_users',
  FOLLOWING_SECTORS = 'following_sectors',
  // Posts by followed users, in followed sectors, or about followed stocks.
  FOLLOWING = 'following',
}

export enum FeedOrder {
  DESC = 'desc',
  ASC = 'asc',
}

function toIdList(value: unknown): string[] | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const ids = raw.map((item) => String(item).trim()).filter(Boolean);
  return ids.length ? ids : undefined;
}

export class FeedQueryDto {
  @IsOptional()
  @IsEnum(FeedType, {
    message: `feed must be one of: ${Object.values(FeedType).join(', ')}`,
  })
  feed: FeedType = FeedType.ALL;

  @IsOptional()
  @Transform(({ value }) => toIdList(value))
  @IsUUID('all', { each: true })
  @ArrayMaxSize(20)
  sectorIds?: string[];

  @IsOptional()
  @Transform(({ value }) => toIdList(value))
  @IsUUID('all', { each: true })
  @ArrayMaxSize(20)
  stockIds?: string[];

  @IsOptional()
  @IsEnum(FeedOrder, {
    message: 'order must be asc or desc',
  })
  order: FeedOrder = FeedOrder.DESC;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
