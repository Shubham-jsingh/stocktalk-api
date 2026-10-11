import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { DeviceToken } from './entities/device-token.entity';

export interface PushPayload {
  title: string;
  body: string;
  // Read by the app to route a tap (type, postId, actorId, link, ...).
  data: Record<string, string>;
  // Shown as the large picture of the notification.
  imageUrl?: string;
}

// FCM accepts at most 500 tokens per multicast request.
const MULTICAST_LIMIT = 500;

// Errors meaning the token will never work again and should be dropped.
const STALE_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export const ANDROID_CHANNEL_ID = 'activity';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokens: Repository<DeviceToken>,
    private readonly firebase: FirebaseAdminService,
  ) {}

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!userIds.length) {
      return;
    }
    const rows = await this.deviceTokens.find({
      where: { userId: In(userIds) },
      select: { token: true },
    });
    await this.sendToTokens(
      rows.map((row) => row.token),
      payload,
    );
  }

  async sendToFollowersOf(userId: string, payload: PushPayload): Promise<void> {
    const rows: { token: string }[] = await this.deviceTokens.query(
      `SELECT dt.token
         FROM device_tokens dt
         JOIN user_follows uf ON uf.follower_id = dt.user_id
        WHERE uf.followee_id = $1`,
      [userId],
    );
    await this.sendToTokens(
      rows.map((row) => row.token),
      payload,
    );
  }

  private async sendToTokens(
    tokens: string[],
    payload: PushPayload,
  ): Promise<void> {
    if (!tokens.length) {
      return;
    }
    const messaging = this.firebase.getMessaging();
    const stale: string[] = [];

    for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
      const batch = tokens.slice(i, i + MULTICAST_LIMIT);
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: { channelId: ANDROID_CHANNEL_ID },
        },
        apns: {
          // mutable-content lets an iOS Notification Service Extension
          // download and attach the image.
          payload: {
            aps: {
              sound: 'default',
              ...(payload.imageUrl ? { mutableContent: true } : {}),
            },
          },
          ...(payload.imageUrl
            ? { fcmOptions: { imageUrl: payload.imageUrl } }
            : {}),
        },
      });
      result.responses.forEach((response, index) => {
        const code = response.error?.code;
        if (code && STALE_TOKEN_ERRORS.has(code)) {
          stale.push(batch[index]);
        }
      });
    }

    if (stale.length) {
      await this.deviceTokens.delete({ token: In(stale) });
      this.logger.log(`Removed ${stale.length} stale device token(s)`);
    }
  }
}
