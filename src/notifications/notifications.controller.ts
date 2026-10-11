import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user';
import {
  MarkReadDto,
  NotificationsQueryDto,
} from './dto/notifications-query.dto';
import {
  RegisterDeviceDto,
  UnregisterDeviceDto,
} from './dto/register-device.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@GetUser() auth: AuthUser, @Query() query: NotificationsQueryDto) {
    return this.notificationsService.list(auth.uid, query.limit, query.cursor);
  }

  @Get('unread-count')
  unreadCount(@GetUser() auth: AuthUser) {
    return this.notificationsService.unreadCount(auth.uid);
  }

  // Alerts tab badge.
  @Get('unseen-count')
  unseenCount(@GetUser() auth: AuthUser) {
    return this.notificationsService.unseenCount(auth.uid);
  }

  @Post('seen')
  @HttpCode(HttpStatus.OK)
  markSeen(@GetUser() auth: AuthUser) {
    return this.notificationsService.markSeen(auth.uid);
  }

  @Post('read')
  @HttpCode(HttpStatus.OK)
  markRead(@GetUser() auth: AuthUser, @Body() dto: MarkReadDto) {
    return this.notificationsService.markRead(auth.uid, dto.ids, dto.postIds);
  }
}

@Controller('devices')
export class DevicesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  register(@GetUser() auth: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.notificationsService.registerDevice(
      auth.uid,
      dto.token,
      dto.platform,
    );
  }

  // Token goes in the body: FCM tokens contain ':' which is awkward in a path.
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  unregister(@GetUser() auth: AuthUser, @Body() dto: UnregisterDeviceDto) {
    return this.notificationsService.unregisterDevice(auth.uid, dto.token);
  }
}
