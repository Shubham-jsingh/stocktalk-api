import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  cert,
  getApps,
  initializeApp,
  ServiceAccount,
} from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (getApps().length > 0) {
      return;
    }

    const credentialsPath = this.config.get<string>('FIREBASE_CREDENTIALS_PATH');
    if (!credentialsPath) {
      throw new Error(
        'FIREBASE_CREDENTIALS_PATH environment variable is required',
      );
    }

    const absolutePath = resolve(credentialsPath);
    const serviceAccount = JSON.parse(
      readFileSync(absolutePath, 'utf8'),
    ) as ServiceAccount;

    initializeApp({
      credential: cert(serviceAccount),
    });

    this.logger.log(`Firebase Admin initialized using ${absolutePath}`);
  }

  getAuth(): Auth {
    return getAuth();
  }
}
