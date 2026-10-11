import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DevicePlatform } from '../entities/device-token.entity';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;

  @IsEnum(DevicePlatform, { message: 'platform must be android or ios' })
  platform: DevicePlatform;
}

export class UnregisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;
}
