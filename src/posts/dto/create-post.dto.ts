import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  // The user creating the post (no auth yet — replace with JWT subject later).
  @IsUUID()
  authorId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true, message: 'each link must be a valid URL' })
  links?: string[];

  @IsOptional()
  @IsUUID()
  sectorId?: string;
}
