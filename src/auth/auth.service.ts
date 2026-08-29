import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { SafeUser, UsersService } from '../users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  access_token: string;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async authenticateFirebaseUser(idToken: string): Promise<AuthResponse> {
    const decoded = await this.verifyFirebaseIdToken(idToken);

    const firebaseUid = decoded.uid;
    const email = decoded.email;
    const fullName = decoded.name ?? null;
    const profilePhotoUrl = decoded.picture ?? null;

    if (!firebaseUid) {
      throw new UnauthorizedException('Firebase token is missing uid');
    }

    if (!email) {
      throw new UnauthorizedException('Firebase token is missing email');
    }

    let user =
      (await this.usersService.findByFirebaseUid(firebaseUid)) ??
      (await this.usersService.findByEmail(email));

    const safeUser = user
      ? await this.usersService.linkFirebaseAccount(user, {
          firebaseUid,
          fullName,
          profilePhotoUrl,
        })
      : await this.usersService.createFirebaseUser({
          email,
          firebaseUid,
          fullName,
          profilePhotoUrl,
        });

    return this.buildAuthResponse(safeUser);
  }

  private async verifyFirebaseIdToken(idToken: string) {
    try {
      return await this.firebaseAdmin.getAuth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }

  private buildAuthResponse(user: SafeUser): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const access_token = this.jwtService.sign(payload);
    if (!access_token) {
      throw new InternalServerErrorException('Failed to generate access token');
    }

    return { access_token, user };
  }
}
