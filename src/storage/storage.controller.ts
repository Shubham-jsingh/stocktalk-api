import { Body, Controller, Post } from '@nestjs/common';
import type { SafeUser } from '../users/users.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SignedUrlDto } from './dto/signed-url.dto';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('signed-url')
  createSignedUrl(@GetUser() user: SafeUser, @Body() dto: SignedUrlDto) {
    return this.storageService.generateUploadSignedUrl(
      user.id,
      dto.fileName,
      dto.contentType,
    );
  }
}
