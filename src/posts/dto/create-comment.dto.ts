import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  // The comment author (no auth yet — replace with JWT subject later).
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  // When set, this comment is a reply to the given top-level comment.
  // Replies are only allowed one level deep.
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}
