import { IsOptional, IsString } from 'class-validator';

export class ReactionDto {
  // Ignored when a Firebase token is present; kept so older clients still validate.
  @IsOptional()
  @IsString()
  userId?: string;
}
