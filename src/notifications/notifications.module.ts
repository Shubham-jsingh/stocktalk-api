import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from '../firebase/firebase.module';
import { Post } from '../posts/entities/post.entity';
import { User } from '../users/entities/user.entity';
import { DeviceToken } from './entities/device-token.entity';
import { Notification } from './entities/notification.entity';
import {
  DevicesController,
  NotificationsController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, DeviceToken, Post, User]),
    FirebaseModule,
  ],
  controllers: [NotificationsController, DevicesController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
