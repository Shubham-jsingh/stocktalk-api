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
import { FollowsService } from './follows.service';

@Controller('users/:userId/follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  // GET /users/:userId/follows -> followed stocks + sectors
  @Get()
  list(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.followsService.listFollows(userId);
  }

  @Post('stocks/:stockId')
  followStock(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('stockId', ParseUUIDPipe) stockId: string,
  ) {
    return this.followsService.followStock(userId, stockId);
  }

  @Delete('stocks/:stockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowStock(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('stockId', ParseUUIDPipe) stockId: string,
  ) {
    return this.followsService.unfollowStock(userId, stockId);
  }

  @Post('sectors/:sectorId')
  followSector(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
  ) {
    return this.followsService.followSector(userId, sectorId);
  }

  @Delete('sectors/:sectorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowSector(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
  ) {
    return this.followsService.unfollowSector(userId, sectorId);
  }
}
