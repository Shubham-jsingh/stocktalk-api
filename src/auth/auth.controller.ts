import { Body, Controller, Get, Post } from '@nestjs/common';
import type { SafeUser } from '../users/users.service';
import { AuthService } from './auth.service';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';
import { FirebaseAuthDto } from './dto/firebase-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('firebase')
  firebaseSignIn(@Body() dto: FirebaseAuthDto) {
    return this.authService.authenticateFirebaseUser(dto.idToken);
  }

  @Get('me')
  getProfile(@GetUser() user: SafeUser) {
    return { user };
  }
}
