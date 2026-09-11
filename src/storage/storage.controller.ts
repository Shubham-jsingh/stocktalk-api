import { Body, Controller, Post } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user';
import { SignedUrlDto } from './dto/signed-url.dto';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('signed-url')
  createSignedUrl(@GetUser() auth: AuthUser, @Body() dto: SignedUrlDto) {
    return this.storageService.generateUploadSignedUrl(
      auth.uid,
      dto.fileName,
      dto.contentType,
    );
  }
}
