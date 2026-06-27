import { IsUUID } from 'class-validator';

export class ReactionDto {
  // The user reacting (no auth yet — replace with JWT subject later).
  @IsUUID()
  userId: string;
}
