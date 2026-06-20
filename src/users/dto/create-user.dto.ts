import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { InvestingStyle } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can only contain letters, numbers and underscores',
  })
  username: string;

  @IsEmail({}, { message: 'a valid email is required' })
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsEnum(InvestingStyle, {
    message: `investingStyle must be one of: ${Object.values(InvestingStyle).join(', ')}`,
  })
  investingStyle?: InvestingStyle;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: 'youtubeLink must be a valid URL' })
  youtubeLink?: string;

  @IsOptional()
  @IsUrl({}, { message: 'instagramLink must be a valid URL' })
  instagramLink?: string;

  @IsOptional()
  @IsUrl({}, { message: 'websiteLink must be a valid URL' })
  websiteLink?: string;

  @IsOptional()
  @IsUrl({}, { message: 'twitterLink must be a valid URL' })
  twitterLink?: string;

  @IsOptional()
  @IsUrl({}, { message: 'profilePhotoUrl must be a valid URL' })
  profilePhotoUrl?: string;
}
