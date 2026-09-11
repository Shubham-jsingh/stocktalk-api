import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from '../../users/users.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthUser } from '../interfaces/auth-user';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const idToken = this.extractBearerToken(request);
    if (!idToken) {
      throw new UnauthorizedException('Missing Authorization Bearer token');
    }

    try {
      const decoded = await this.firebaseAdmin.getAuth().verifyIdToken(idToken);
      const uid = decoded.uid;
      if (!uid) {
        throw new UnauthorizedException('Firebase token is missing uid');
      }

      const email = decoded.email ?? null;
      const roles = this.extractRoles(decoded as DecodedIdToken & Record<string, unknown>);
      const user = await this.usersService.upsertFromFirebase({
        uid,
        email,
        fullName: typeof decoded.name === 'string' ? decoded.name : null,
        profilePhotoUrl:
          typeof decoded.picture === 'string' ? decoded.picture : null,
      });

      request.user = {
        uid,
        email,
        roles,
        user,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  private extractRoles(decoded: DecodedIdToken & Record<string, unknown>): string[] {
    const roles = decoded.roles;
    if (Array.isArray(roles) && roles.every((role) => typeof role === 'string')) {
      return roles;
    }

    const role = decoded.role;
    if (typeof role === 'string' && role.length > 0) {
      return [role];
    }

    return [];
  }
}
