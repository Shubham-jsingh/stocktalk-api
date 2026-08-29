import { IsNotEmpty, IsString } from 'class-validator';

export class SignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;
}
