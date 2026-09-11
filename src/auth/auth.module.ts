import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [AuthController],
  providers: [FirebaseAuthGuard],
  exports: [FirebaseModule, UsersModule, FirebaseAuthGuard],
})
export class AuthModule {}
