import { Controller, Get } from '@nestjs/common';
import { GetUser } from './decorators/get-user.decorator';
import type { AuthUser } from './interfaces/auth-user';

@Controller('auth')
export class AuthController {
  @Get('me')
  getProfile(@GetUser() auth: AuthUser) {
    return {
      uid: auth.uid,
      email: auth.email,
      roles: auth.roles,
      user: auth.user,
    };
  }
}
