import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user';
import { FollowsService } from './follows.service';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Get()
  list(@GetUser() auth: AuthUser) {
    return this.followsService.listFollows(auth.uid);
  }

  @Post('stocks/:stockId')
  followStock(
    @GetUser() auth: AuthUser,
    @Param('stockId', ParseUUIDPipe) stockId: string,
  ) {
    return this.followsService.followStock(auth.uid, stockId);
  }

  @Delete('stocks/:stockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowStock(
    @GetUser() auth: AuthUser,
    @Param('stockId', ParseUUIDPipe) stockId: string,
  ) {
    return this.followsService.unfollowStock(auth.uid, stockId);
  }

  @Post('sectors/:sectorId')
  followSector(
    @GetUser() auth: AuthUser,
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
  ) {
    return this.followsService.followSector(auth.uid, sectorId);
  }

  @Delete('sectors/:sectorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowSector(
    @GetUser() auth: AuthUser,
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
  ) {
    return this.followsService.unfollowSector(auth.uid, sectorId);
  }

  @Post('users/:targetUserId')
  followUser(
    @GetUser() auth: AuthUser,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.followsService.followUser(auth.uid, targetUserId);
  }

  @Delete('users/:targetUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowUser(
    @GetUser() auth: AuthUser,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.followsService.unfollowUser(auth.uid, targetUserId);
  }
}
