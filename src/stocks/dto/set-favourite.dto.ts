import { IsBoolean } from 'class-validator';

export class SetFavouriteDto {
  @IsBoolean()
  isFavourite: boolean;
}
