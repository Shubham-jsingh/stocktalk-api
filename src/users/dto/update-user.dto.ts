import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { InvestingStyle } from '../entities/user.entity';

// Profile edit DTO. Username/email/password changes are intentionally excluded
// (those belong to dedicated account/security endpoints).
export class UpdateUserDto {
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
