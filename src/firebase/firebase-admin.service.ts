import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (getApps().length > 0) {
      return;
    }

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');

    initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });

    this.logger.log(
      projectId
        ? `Firebase Admin initialized with ADC (project ${projectId})`
        : 'Firebase Admin initialized with Application Default Credentials',
    );
  }

  getAuth(): Auth {
    return getAuth();
  }
}
