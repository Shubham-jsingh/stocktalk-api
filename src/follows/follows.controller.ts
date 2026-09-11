import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user';
import { FollowsService } from './follows.service';

@Controller('users/:userId/follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Public()
  @Get()
  list(@Param('userId') userId: string) {
    return this.followsService.listFollows(userId);
  }

  @Post('stocks/:stockId')
  followStock(
    @GetUser() auth: AuthUser,
    @Param('userId') userId: string,
    @Param('stockId', ParseUUIDPipe) stockId: string,
  ) {
    this.assertSelf(auth, userId);
    return this.followsService.followStock(auth.uid, stockId);
  }

  @Delete('stocks/:stockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowStock(
    @GetUser() auth: AuthUser,
    @Param('userId') userId: string,
    @Param('stockId', ParseUUIDPipe) stockId: string,
  ) {
    this.assertSelf(auth, userId);
    return this.followsService.unfollowStock(auth.uid, stockId);
  }

  @Post('sectors/:sectorId')
  followSector(
    @GetUser() auth: AuthUser,
    @Param('userId') userId: string,
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
  ) {
    this.assertSelf(auth, userId);
    return this.followsService.followSector(auth.uid, sectorId);
  }

  @Delete('sectors/:sectorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowSector(
    @GetUser() auth: AuthUser,
    @Param('userId') userId: string,
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
  ) {
    this.assertSelf(auth, userId);
    return this.followsService.unfollowSector(auth.uid, sectorId);
  }

  @Post('users/:targetUserId')
  followUser(
    @GetUser() auth: AuthUser,
    @Param('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    this.assertSelf(auth, userId);
    return this.followsService.followUser(auth.uid, targetUserId);
  }

  @Delete('users/:targetUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowUser(
    @GetUser() auth: AuthUser,
    @Param('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    this.assertSelf(auth, userId);
    return this.followsService.unfollowUser(auth.uid, targetUserId);
  }

  private assertSelf(auth: AuthUser, userId: string): void {
    if (auth.uid !== userId) {
      throw new ForbiddenException('You can only modify your own follows');
    }
  }
}
