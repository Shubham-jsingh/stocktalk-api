import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CheckUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can only contain letters, numbers and underscores',
  })
  username: string;
}
